// IMPORTS
// ================================================================================================
import {
    StarkConfig, StarkLimits, TransitionFunction, ConstraintEvaluator, ConstantDefinition
} from '@guildofweavers/air-script';
import { PrimeField } from '@guildofweavers/galois';
import { tokenMatcher } from 'chevrotain';
import { parser } from './parser';
import { Plus, Star, Slash, Pound, Minus } from './lexer';
import { StatementBlockContext } from './StatementBlockContext';
import { getOperationHandler } from './operations';
import { Dimensions, isScalar, isVector } from './utils';

// INTERFACES
// ================================================================================================
export interface Statement {
    variable            : string;
    expression          : Expression;
}

export interface Expression {
    code                : string;
    dimensions          : Dimensions;
}

export interface ConstantDeclaration {
    name                : string;
    value               : any;
    dimensions          : Dimensions;
}

export interface TransitionFunctionInfo {
    steps               : number;
    registerCount       : number;
    transitionFunction  : TransitionFunction
}

export interface TransitionConstraintInfo {
    constraintCount     : number;
    maxConstraintDegree : number;
    constraintEvaluator : ConstraintEvaluator;
}

// MODULE VARIABLES
// ================================================================================================
const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

class AirVisitor extends BaseCstVisitor {

    constructor() {
        super()
        this.validateVisitor()
    }

    script(ctx: any, limits: StarkLimits): StarkConfig {

        const starkName = ctx.starkName[0].image;

        const modulus = this.visit(ctx.modulus);
        const field = new PrimeField(modulus);

        // parse constants
        const globalConstants: any = {};
        const globalConstantMap = new Map<string, Dimensions>();
        if (ctx.constants) {
            for (let i = 0; i < ctx.constants.length; i++) {
                let constant: ConstantDeclaration = this.visit(ctx.constants[i]);
                globalConstants[constant.name] = constant.value;
                // TODO: check for duplicates
                globalConstantMap.set(constant.name, constant.dimensions);
            }
        }

        // TODO: parse readonly registers
        const readonlyRegisters: ConstantDefinition[] = [];

        const tFunction: TransitionFunctionInfo = this.visit(ctx.tFunction, limits);
        const tConstraints: TransitionConstraintInfo = this.visit(ctx.tConstraints, limits);

        return {
            name                : starkName,
            field               : field,
            steps               : tFunction.steps,
            registerCount       : tFunction.registerCount,
            constraintCount     : tConstraints.constraintCount,
            transitionFunction  : tFunction.transitionFunction,
            constraintEvaluator : tConstraints.constraintEvaluator,
            maxConstraintDegree : tConstraints.maxConstraintDegree,
            readonlyRegisters   : readonlyRegisters,
            globalConstants     : globalConstants
        };
    }

    // GLOBAL CONSTANTS
    // --------------------------------------------------------------------------------------------
    constantDeclaration(ctx: any): ConstantDeclaration {
        const name = ctx.constantName[0].image;
        let value: any;
        let dimensions: Dimensions;
        if (ctx.value) {
            value = this.visit(ctx.value);
            dimensions = [0, 0];
        }
        else if (ctx.vector) {
            value = this.visit(ctx.vector);
            dimensions = [value.length, 0];
        }
        else if (ctx.matrix) {
            value = this.visit(ctx.matrix);
            dimensions = [value.length, value[0].length];
        }
        else {
            throw new Error('Invalid constant declaration'); // TODO: better error
        }

        // TODO: validate variable name

        return { name, value, dimensions };
    }

    literalVector(ctx: any) {
        const vector = new Array<bigint>(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            let element: bigint = this.visit(ctx.elements[i]);
            vector[i] = element;
        }
        return vector;
    }

    literalMatrix(ctx: any) {

        let colCount = 0;
        const rowCount = ctx.rows.length;
        const matrix = new Array<bigint[]>(rowCount);
        
        for (let i = 0; i < rowCount; i++) {
            let row: bigint[] = this.visit(ctx.rows[i]);
            if (colCount === 0) {
                colCount = row.length;
            }
            else if (colCount !== row.length) {
                throw new Error('All matrix rows must have the same number of columns')
            }
            matrix[i] = row;
        }
        return matrix;
    }

    literalMatrixRow(ctx: any) {
        const row = new Array<bigint>(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i]);
            row[i] = element;
        }
        return row;
    }

    // READONLY REGISTERS
    // --------------------------------------------------------------------------------------------
    readonlyRegisters(ctx: any) {

    }

    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    transitionFunction(ctx: any, limits: StarkLimits) {
        const steps = ctx.steps[0].image;
        const blocks = [this.visit(ctx.blocks)];

        return {
            steps, blocks
        };
    }

    transitionConstraints(ctx: any, limits: StarkLimits) {
        return { test: 'tConstraints' };
    }

    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statementBlock(ctx: any, cbc: StatementBlockContext) {

        let code = '';
        for (let i = 0; i < ctx.statements.length; i++) {
            let statement: Statement = this.visit(ctx.statements[i], cbc);
            let variable = statement.variable;
            let expression = statement.expression;
            cbc.setVariableDimensions(variable, expression.dimensions);
            code += `$${variable} = ${expression.code};\n`;
        }

        const out: Expression = this.visit(ctx.outStatement, cbc);
        code += out.code;
        
        return { code, dimensions: out.dimensions };
    }

    statement(ctx: any, cbc: StatementBlockContext): Statement {
        const variable = ctx.variableName[0].image;
        const expression = this.visit(ctx.expression, cbc);
        return { variable, expression };
    }

    outStatement(ctx: any, cbc: StatementBlockContext): Expression {
        let code = '', dimensions: Dimensions;
        if (ctx.expression) {
            const expression: Expression = this.visit(ctx.expression, cbc);
            if (isScalar(expression.dimensions)) {
                code = `out[0] = ${expression.code};\n`;
                dimensions = [1, 0];
            }
            else if (isVector(expression.dimensions)) {
                dimensions = expression.dimensions;
                code = `_out = ${expression.code};\n`;
                for (let i = 0; i < dimensions[0]; i++) {
                    code += `out[${i}] = _out[${i}];\n`;
                }
            }
            else {
                throw new Error('Out statement must evaluate either to a scalar or to a vector');
            }
        }
        else {
            dimensions = [ctx.expressions.length, 0];
            for (let i = 0; i < ctx.expressions.length; i++) {
                let expression = this.visit(ctx.expressions[i], cbc);
                if (!isScalar(expression.dimensions)) {
                    throw new Error(`Out vector elements must be scalars`);
                }
                code += `out[${i}] = ${expression.code};\n`;
            }
        }

        return { code, dimensions };
    }

    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    vector(ctx: any, cbc: StatementBlockContext): Expression {

        const dimensions: Dimensions = [ctx.elements.length, 0];
        let code = `[`;
        for (let i = 0; i < ctx.elements.length; i++) {
            let element: Expression = this.visit(ctx.elements[i], cbc);
            if (!isScalar(element.dimensions)) throw new Error('Vector elements must be scalars');
            code += `${element.code}, `;
        }
        code = code.slice(0, -2) + ']';

        return { dimensions, code };
    }

    matrix(ctx: any, cbc: StatementBlockContext): Expression {

        const rowCount = ctx.rows.length;
        let colCount = 0;

        let code = `[`;
        for (let i = 0; i < rowCount; i++) {
            let row: Expression = this.visit(ctx.rows[i], cbc);
            if (colCount === 0) {
                colCount = row.dimensions[0];
            }
            else if (colCount !== row.dimensions[0]) {
                throw new Error('All matrix rows must have the same number of columns')
            }
            code += `${row.code}, `;
        }
        code = code.slice(0, -2) + ']';

        return { dimensions: [rowCount, colCount], code };
    }

    matrixRow(ctx: any, cbc: StatementBlockContext): Expression {

        const dimensions: Dimensions = [ctx.elements.length, 0];
        let code = `[`;
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i], cbc);
            if (!isScalar(element.dimensions)) throw new Error('Matrix elements must be scalars');
            code += `${element.code}, `;
        }
        code = code.slice(0, -2) + ']';

        return { dimensions, code };
    }

    // EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    expression(ctx: any, cbc: StatementBlockContext): Expression {
        return this.visit(ctx.addExpression, cbc);
    }

    addExpression(ctx: any, cbc: StatementBlockContext): Expression {
        let result: Expression = this.visit(ctx.lhs, cbc);

        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhs: Expression = this.visit(rhsOperand, cbc);
                let opHandler = getOperationHandler(ctx.AddOp[i]);
                let dimensions = opHandler.getDimensions(result.dimensions, rhs.dimensions);
                let code = opHandler.getCode(result, rhs);
                result = { code, dimensions };
            });
        }

        return result;
    }

    mulExpression(ctx: any, cbc: StatementBlockContext): Expression {
        let result: Expression = this.visit(ctx.lhs, cbc);

        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhs: Expression = this.visit(rhsOperand, cbc);
                let opHandler = getOperationHandler(ctx.MulOp[i]);
                let dimensions = opHandler.getDimensions(result.dimensions, rhs.dimensions);
                let code = opHandler.getCode(result, rhs);
                result = { code, dimensions };
            });
        }

        return result;
    }

    expExpression(ctx: any, cbc: StatementBlockContext): Expression {
        let result: Expression = this.visit(ctx.lhs, cbc);

        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhs: Expression = this.visit(rhsOperand, cbc);
                let opHandler = getOperationHandler(ctx.ExpOp[i]);
                let dimensions = opHandler.getDimensions(result.dimensions, rhs.dimensions);
                let code = opHandler.getCode(result, rhs);
                result = { code, dimensions };
            });
        }

        return result;
    }

    atomicExpression(ctx: any, cbc: StatementBlockContext): Expression {
        if (ctx.parenExpression) {
            return this.visit(ctx.parenExpression);
        }
        else if (ctx.Identifier) {
            const variable = ctx.Identifier[0].image;
            const dimensions = cbc.getVariableDimensions(variable);
            if (!dimensions) {
                throw new Error(`Variable '${variable}' is not defined`);
            }
            return { code: `$${variable}`, dimensions };
        }
        else if (ctx.MutableRegister) {
            const register = ctx.MutableRegister[0].image;
            return { code: cbc.buildRegisterReference(register), dimensions: [0,0] };
        }
        else if (ctx.ReadonlyRegister) {
            const register = ctx.ReadonlyRegister[0].image;
            return { code: cbc.buildRegisterReference(register), dimensions: [0,0] };
        }
        else if (ctx.IntegerLiteral) {
            const value = ctx.IntegerLiteral[0].image;
            return { code: `${value}n`, dimensions: [0,0] };
        }
        else {
            throw new Error('Invalid atomic expression'); // TODO: better error
        }
    }

    parenExpression(ctx: any) {
        return this.visit(ctx.expression);
    }

    // LITERAL EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    literalExpression(ctx: any): bigint {
        return this.visit(ctx.literalAddExpression);
    }

    literalAddExpression(ctx: any): bigint {
        let result: bigint = this.visit(ctx.lhs);

        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhsValue: bigint = this.visit(rhsOperand)
                let operator = ctx.AddOp[i];

                if (tokenMatcher(operator, Plus)) {
                    result = result + rhsValue;
                }
                else if (tokenMatcher(operator, Minus)) {
                    result = result - rhsValue;
                }
            });
        }

        return result;
    }

    literalMulExpression(ctx: any): bigint {
        let result: bigint = this.visit(ctx.lhs);

        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhsValue: bigint = this.visit(rhsOperand)
                let operator = ctx.MulOp[i];

                if (tokenMatcher(operator, Star)) {
                    result = result * rhsValue;
                }
                else if (tokenMatcher(operator, Slash)) {
                    result = result / rhsValue;
                }
                else if (tokenMatcher(operator, Pound)) {
                    throw new Error('Matrix multiplication is supported for literal expressions')
                }
            });
        }

        return result;
    }

    literalExpExpression(ctx: any): bigint {
        let result: bigint = this.visit(ctx.lhs);

        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any) => {
                let rhsValue: bigint = this.visit(rhsOperand);
                result = result ** rhsValue;
            });
        }

        return result;
    }

    literalAtomicExpression(ctx: any): bigint {
        if (ctx.literalParenExpression) {
            return this.visit(ctx.literalParenExpression);
        }
        else if (ctx.IntegerLiteral) {
            return BigInt(ctx.IntegerLiteral[0].image);
        }
        else {
            throw new Error('Invalid atomic expression'); // TODO: better error
        }
    }

    literalParenExpression(ctx: any): bigint {
        return this.visit(ctx.literalExpression);
    }
}

// EXPORT VISITOR INSTANCE
// ================================================================================================
export const visitor = new AirVisitor();