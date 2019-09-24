// IMPORTS
// ================================================================================================
import { StarkLimits, ConstraintSpecs } from '@guildofweavers/air-script';
import { FiniteField, createPrimeField, WasmOptions } from '@guildofweavers/galois';
import { tokenMatcher } from 'chevrotain';
import { AirConfig } from './AirObject';
import { parser } from './parser';
import { Plus, Star, Slash, Pound, Minus } from './lexer';
import { ScriptSpecs } from './ScriptSpecs';
import { ExecutionContext } from './contexts';
import { ReadonlyValuePattern, ReadonlyRegisterSpecs, InputRegisterSpecs } from './registers';
import { Expression, StatementBlock, Statement } from './expressions';
import * as expressions from './expressions';
import { Dimensions, validateVariableName } from './utils';
import { CodeGenerator } from './generator';

// INTERFACES
// ================================================================================================
export interface ConstantDeclaration {
    name            : string;
    value           : bigint | bigint [] | bigint[][];
    dimensions      : Dimensions;
}

export interface ReadonlyRegisterDeclaration {
    name            : string;
    type            : 'k' | 'p' | 's';
    index           : number;
    pattern         : ReadonlyValuePattern;
    binary          : boolean;
    values?         : bigint[];    
}

export interface ReadonlyRegisterGroup {
    staticRegisters : ReadonlyRegisterSpecs[];
    secretRegisters : InputRegisterSpecs[];
    publicRegisters : InputRegisterSpecs[];
}

// MODULE VARIABLES
// ================================================================================================
const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

class AirVisitor extends BaseCstVisitor {

    constructor() {
        super()
        this.validateVisitor()
    }

    script(ctx: any, config: { limits: StarkLimits; wasmOptions?: WasmOptions; }): AirConfig {

        const starkName = ctx.starkName[0].image;

        // set up the field
        const field: FiniteField = this.visit(ctx.fieldDeclaration, config.wasmOptions);

        // build script specs
        const specs = new ScriptSpecs(config.limits);
        specs.setField(field);
        specs.setSteps(this.visit(ctx.steps));
        specs.setMutableRegisterCount(this.visit(ctx.mutableRegisterCount));
        specs.setReadonlyRegisterCount(this.visit(ctx.readonlyRegisterCount));
        specs.setConstraintCount(this.visit(ctx.constraintCount));
        if (ctx.staticConstants) {
            specs.setStaticConstants(ctx.staticConstants.map((element: any) => this.visit(element)));
        }

        // build readonly registers
        let readonlyRegisters: ReadonlyRegisterGroup;
        if (specs.readonlyRegisterCount > 0) {
            validateReadonlyRegisterDefinitions(ctx.readonlyRegisters);
            readonlyRegisters = this.visit(ctx.readonlyRegisters, specs);
        }
        else {
            readonlyRegisters = { staticRegisters: [], secretRegisters: [], publicRegisters: [] };
        }
        specs.setReadonlyRegisterCounts(readonlyRegisters);

        // instantiate code generator
        const generator = new CodeGenerator(specs);

        // build transition function
        validateTransitionFunction(ctx.transitionFunction);
        const tFunctionBody: StatementBlock = this.visit(ctx.transitionFunction, specs);
        const tFunction = generator.generateTransitionFunction(tFunctionBody);

        // build transition constraint evaluator
        validateTransitionConstraints(ctx.transitionConstraints);
        const tConstraintsBody: StatementBlock = this.visit(ctx.transitionConstraints, specs);
        const tConstraints = generator.generateConstraintEvaluator(tConstraintsBody);

        // validate constraint valuator degrees
        const constraintSpecs = new Array<ConstraintSpecs>(specs.constraintCount);
        for (let i = 0; i < constraintSpecs.length; i++) {
            let degree = typeof tConstraintsBody.degree === 'bigint'
                ? tConstraintsBody.degree
                : tConstraintsBody.degree[i] as bigint;
            constraintSpecs[i] = { degree: specs.validateConstraintDegree(degree) };
        }

        // build and return AIR config
        return {
            name                : starkName,
            field               : field,
            steps               : specs.steps,
            stateWidth          : specs.mutableRegisterCount,
            secretInputs        : readonlyRegisters.secretRegisters,
            publicInputs        : readonlyRegisters.publicRegisters,
            staticRegisters     : readonlyRegisters.staticRegisters,
            constraints         : constraintSpecs,
            transitionFunction  : tFunction,
            constraintEvaluator : tConstraints
        };
    }

    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    fieldDeclaration(ctx: any, wasmOptions?: WasmOptions) {
        const modulus = this.visit(ctx.modulus);
        return createPrimeField(modulus, wasmOptions);
    }

    // STATIC CONSTANTS
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
            throw new Error(`Failed to parse the value of static constant '${name}'`);
        }

        validateVariableName(name, dimensions);
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
    readonlyRegisters(ctx: any, specs: ScriptSpecs): ReadonlyRegisterGroup {

        const registerNames = new Set<string>();
        const staticRegisters: ReadonlyRegisterSpecs[] = [];
        const secretRegisters: InputRegisterSpecs[] = [];
        const publicRegisters: InputRegisterSpecs[] = [];

        if (ctx.registers) {
            ctx.registers.forEach((declaration: any) => {
                let register: ReadonlyRegisterDeclaration = this.visit(declaration, specs);
                if (registerNames.has(register.name)) {
                    throw new Error(`readonly register ${register.name} is defined more than once`);
                }
                registerNames.add(register.name);

                let insertIndex: number | undefined;
                if (register.type === 'k') {
                    staticRegisters.push({ pattern: register.pattern, values: register.values!, binary: register.binary });
                    insertIndex = staticRegisters.length - 1;
                }
                else if (register.type === 'p') {
                    publicRegisters.push({ pattern: register.pattern, binary: register.binary });
                    insertIndex = publicRegisters.length - 1;
                }
                else if (register.type === 's') {
                    secretRegisters.push({ pattern: register.pattern, binary: register.binary });
                    insertIndex = secretRegisters.length - 1;
                }

                if (register.index !== insertIndex) {
                    throw new Error(`readonly register ${register.name} is declared out of order`);
                }
            });
        }

        return { staticRegisters, secretRegisters, publicRegisters };
    }

    readonlyRegisterDefinition(ctx: any, specs: ScriptSpecs): ReadonlyRegisterDeclaration {
        const registerName = ctx.name[0].image;
        const registerType = registerName.slice(1,2);
        const registerIndex = Number.parseInt(registerName.slice(2), 10);
        const pattern = ctx.pattern[0].image;
        const binary: boolean = ctx.binary ? true : false;

        let values: bigint[] | undefined;
        if (registerType === 'k') {
            // parse values for static registers
            if (!ctx.values) throw new Error(`invalid definition for static register ${registerName}: static values must be provided for the register`);
            values = this.visit(ctx.values) as bigint[];
            if (specs.steps % values.length !== 0) {
                throw new Error(`invalid definition for static register ${registerName}: number of values must evenly divide the number of steps (${specs.steps})`);
            }
    
            if (binary) {
                for (let value of values) {
                    if (value !== specs.field.zero && value !== specs.field.one) {
                        throw new Error(`invalid definition for binary readonly register ${registerName}: the register contains non-binary values`);
                    }
                }
            }
        }
        else if (registerType === 'p' || registerType === 's') {
            if (ctx.values) throw new Error(`invalid definition for input register ${registerName}: static values cannot be provided for the register`);
        }
        else {
            throw new Error(`invalid readonly register definition: register name ${registerName} is invalid`);
        }

        return { name: registerName, type: registerType, index: registerIndex, pattern, binary, values };
    }

    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    transitionFunction(ctx: any, specs: ScriptSpecs): StatementBlock {
        const exc = new ExecutionContext(specs, false);
        const statements: StatementBlock = this.visit(ctx.statements, exc);
        return statements;
    }

    transitionConstraints(ctx: any, specs: ScriptSpecs): StatementBlock {
        const exc = new ExecutionContext(specs, true);
        const statements: StatementBlock = this.visit(ctx.statements, exc);
        return statements;
    }

    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statementBlock(ctx: any, exc: ExecutionContext): StatementBlock {
        let statements: Statement[] | undefined;
        if (ctx.statements) {
            statements = ctx.statements.map((stmt: any) => this.visit(stmt, exc));
        }
        const out: Expression = this.visit(ctx.expression, exc);
        return new StatementBlock(out, statements);
    }

    statement(ctx: any, exc: ExecutionContext): Statement {
        const expression = this.visit(ctx.expression, exc);
        const variable = exc.setVariableAssignment(ctx.variableName[0].image, expression);
        return { variable, expression };
    }

    // WHEN...ELSE EXPRESSION
    // --------------------------------------------------------------------------------------------
    whenExpression(ctx: any, exc: ExecutionContext): Expression {
        const registerName: string = ctx.condition[0].image;
        const registerRef = exc.getRegisterReference(registerName);

        // make sure the condition register holds only binary values
        if (!exc.isBinaryRegister(registerName)) {
            throw new Error(`when...else expression condition must be based on a binary register`);
        }

        // build subroutines for true and false conditions
        exc.createNewVariableFrame();
        const tBlock: StatementBlock = this.visit(ctx.tBlock, exc);
        exc.destroyVariableFrame();

        exc.createNewVariableFrame();
        const fBlock: StatementBlock = this.visit(ctx.fBlock, exc);
        exc.destroyVariableFrame();

        return new expressions.WhenExpression(registerRef, tBlock, fBlock);
    }

    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    vector(ctx: any, exc: ExecutionContext): Expression {
        const elements = ctx.elements.map((e: any) => this.visit(e, exc));
        return new expressions.CreateVector(elements);
    }

    vectorDestructuring(ctx: any, exc: ExecutionContext): Expression {
        const vector = this.visit(ctx.vector, exc);
        return new expressions.DestructureVector(vector);
    }

    matrix(ctx: any, exc: ExecutionContext): Expression {
        const elements = ctx.rows.map((r: any) => this.visit(r, exc));
        return new expressions.CreateMatrix(elements);
    }

    matrixRow(ctx: any, exc: ExecutionContext): Expression[] {
        return ctx.elements.map((e: any) => this.visit(e, exc));
    }

    // EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    expression(ctx: any, exc: ExecutionContext): Expression {
        let result: Expression = this.visit(ctx.lhs, exc);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhs: Expression = this.visit(rhsOperand, exc);
                let opToken = ctx.AddOp[i];
                if (tokenMatcher(opToken, Plus)) {
                    result = expressions.BinaryOperation.add(result, rhs);
                }
                else if (tokenMatcher(opToken, Minus)) {
                    result = expressions.BinaryOperation.sub(result, rhs);
                }
                else {
                    throw new Error(`Invalid operator '${opToken.image}'`);
                }
            });
        }
        return result;
    }

    mulExpression(ctx: any, exc: ExecutionContext): Expression {
        let result: Expression = this.visit(ctx.lhs, exc);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhs: Expression = this.visit(rhsOperand, exc);
                let opToken = ctx.MulOp[i];
                if (tokenMatcher(opToken, Star)) {
                    result = expressions.BinaryOperation.mul(result, rhs);
                }
                else if (tokenMatcher(opToken, Slash)) {
                    result = expressions.BinaryOperation.div(result, rhs);
                }
                else if (tokenMatcher(opToken, Pound)) {
                    result = expressions.BinaryOperation.prod(result, rhs);
                }
                else {
                    throw new Error(`Invalid operator '${opToken.image}'`);
                }
            });
        }
        return result;
    }

    expExpression(ctx: any, exc: ExecutionContext): Expression {
        let result: Expression = this.visit(ctx.base, exc);
        if (ctx.exponent) {
            ctx.exponent.forEach((expOperand: any, i: number) => {
                let exponent: Expression = this.visit(expOperand, exc);
                result = expressions.BinaryOperation.exp(result, exponent);
            });
        }
        return result;
    }

    vectorExpression(ctx: any, exc: ExecutionContext): Expression {
        let result: Expression = this.visit(ctx.expression, exc);
        if (ctx.rangeStart) {
            const rangeStart = Number.parseInt(ctx.rangeStart[0].image, 10);
            const rangeEnd = Number.parseInt(ctx.rangeEnd[0].image, 10);
            result = new expressions.SliceVector(result, rangeStart, rangeEnd);
        }
        else if (ctx.index) {
            const index = Number.parseInt(ctx.index[0].image, 10);
            result = new expressions.ExtractVectorElement(result, index);
        }
        return result;
    }

    atomicExpression(ctx: any, exc: ExecutionContext): Expression {
        if (ctx.expression) {
            return this.visit(ctx.expression, exc);
        }
        else if (ctx.variable) {
            const variable = ctx.variable[0].image;
            return exc.getVariableReference(variable);
        }
        else if (ctx.register) {
            const register = ctx.register[0].image;
            return exc.getRegisterReference(register);
        }
        else if (ctx.literal) {
            const value: string = ctx.literal[0].image;
            return new expressions.LiteralExpression(value);
        }
        else {
            throw new Error('Invalid expression syntax');
        }
    }

    // LITERAL EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    literalExpression(ctx: any): bigint {
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
        let result: bigint = this.visit(ctx.base);
        if (ctx.exponent) {
            ctx.exponent.forEach((expOperand: any) => {
                let expValue: bigint = this.visit(expOperand);
                result = result ** expValue;
            });
        }
        return result;
    }

    literalAtomicExpression(ctx: any): bigint {
        if (ctx.expression)     return this.visit(ctx.expression);
        else if (ctx.literal)   return BigInt(ctx.literal[0].image);
        else                    throw new Error('Invalid expression syntax');
    }
}

// EXPORT VISITOR INSTANCE
// ================================================================================================
export const visitor = new AirVisitor();

// HELPER FUNCTIONS
// ================================================================================================
function validateTransitionFunction(value: any[] | undefined) {
    if (!value || value.length === 0) {
        throw new Error('Transition function is not defined');
    }
    else if (value.length > 1) {
        throw new Error('Transition function is defined more than once');
    }
}

function validateTransitionConstraints(value: any[] | undefined) {
    if (!value || value.length === 0) {
        throw new Error('Transition constraints are not defined');
    }
    else if (value.length > 1) {
        throw new Error('Transition constraints are defined more than once');
    }
}

function validateReadonlyRegisterDefinitions(value: any[]) {
    if (value.length > 1) {
        throw new Error('Readonly registers are defined more than once');
    }
}