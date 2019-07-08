// IMPORTS
// ================================================================================================
import { StarkLimits, ConstraintSpecs } from '@guildofweavers/air-script';
import { AirConfig, ReadonlyValuePattern, ReadonlyRegisterSpecs, InputRegisterSpecs } from './AirObject';
import { PrimeField, FiniteField } from '@guildofweavers/galois';
import { tokenMatcher } from 'chevrotain';
import { parser } from './parser';
import { Plus, Star, Slash, Pound, Minus } from './lexer';
import { ScriptSpecs } from './ScriptSpecs';
import { StatementContext } from './StatementContext';
import { getOperationHandler, addition as addHandler, subtraction as subHandler, multiplication as mulHandler } from './operations';
import { Dimensions, isScalar, isVector, isMatrix, validateVariableName, areSameDimension } from './utils';

// INTERFACES
// ================================================================================================
export interface StatementBlock {
    code            : string;
    outputSize      : number;
}

export interface Statement {
    variable        : string;
    expression      : Expression;
}

export interface Expression {
    code            : string;
    dimensions      : Dimensions;
    destructured?   : boolean;
}

export interface ConstantDeclaration {
    name            : string;
    value           : bigint | bigint [] | bigint[][];
    dimensions      : Dimensions;
}

export interface ReadonlyRegisterDeclaration {
    name            : string;
    index           : number;
    pattern         : ReadonlyValuePattern;
    binary          : boolean;
    values?         : bigint[];    
}

export interface ReadonlyRegisterGroup {
    presetRegisters : ReadonlyRegisterSpecs[];
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

    script(ctx: any, limits: StarkLimits): AirConfig {

        const starkName = ctx.starkName[0].image;

        // set up the field
        const field: FiniteField = this.visit(ctx.fieldDeclaration);

        // build global constants
        const globalConstants: any = {};
        const globalConstantMap = new Map<string, Dimensions>();
        if (ctx.globalConstants) {
            for (let i = 0; i < ctx.globalConstants.length; i++) {
                let constant: ConstantDeclaration = this.visit(ctx.globalConstants[i]);
                if (globalConstantMap.has(constant.name)) {
                    throw new Error(`Global constant '${constant.name}' is defined more than once`);
                }
                globalConstants[constant.name] = constant.value;
                globalConstantMap.set(constant.name, constant.dimensions);
            }
        }

        // build script specs
        const specs = new ScriptSpecs(limits);
        specs.setField(field);
        specs.setSteps(this.visit(ctx.steps));
        specs.setMutableRegisterCount(this.visit(ctx.mutableRegisterCount));
        specs.setReadonlyRegisterCount(this.visit(ctx.readonlyRegisterCount));
        specs.setConstraintCount(this.visit(ctx.constraintCount));
        specs.setMaxConstraintDegree(this.visit(ctx.maxConstraintDegree));
        specs.setGlobalConstants(globalConstantMap);

        // build readonly registers
        let readonlyRegisters: ReadonlyRegisterGroup;
        if (specs.readonlyRegisterCount > 0) {
            validateReadonlyRegisterDefinitions(ctx.readonlyRegisters);
            readonlyRegisters = this.visit(ctx.readonlyRegisters, specs);
        }
        else {
            readonlyRegisters = { presetRegisters: [], secretRegisters: [], publicRegisters: [] };
        }
        specs.setReadonlyRegisterCounts(readonlyRegisters);

        // build transition function
        validateTransitionFunction(ctx.transitionFunction);
        const tFunction: Function = this.visit(ctx.transitionFunction, specs);

        // build transition constraint evaluator
        validateTransitionConstraints(ctx.transitionConstraints);
        const tConstraintEvaluator: Function = this.visit(ctx.transitionConstraints, specs);
        const constraints = new Array<ConstraintSpecs>(specs.constraintCount);
        for (let i = 0; i < constraints.length; i++) {
            // TODO: determine degree of each constraint individually
            constraints[i] = { degree: specs.maxConstraintDegree };
        }

        // build and return stark config
        return {
            name                : starkName,
            field               : field,
            steps               : specs.steps,
            stateWidth          : specs.mutableRegisterCount,
            secretInputs        : readonlyRegisters.secretRegisters,
            publicInputs        : readonlyRegisters.publicRegisters,
            presetRegisters     : readonlyRegisters.presetRegisters,
            globalConstants     : globalConstants,
            constraints         : constraints,
            transitionFunction  : tFunction,
            constraintEvaluator : tConstraintEvaluator
        };
    }

    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    fieldDeclaration(ctx: any) {
        const modulus = this.visit(ctx.modulus);
        return new PrimeField(modulus);
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
            throw new Error(`Failed to parse the value of global constant '${name}'`);
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

        const presetRegisters: ReadonlyRegisterSpecs[] = [];
        if (ctx.presetRegisters) {
            for (let i = 0; i < ctx.presetRegisters.length; i++) {
                let register: ReadonlyRegisterDeclaration = this.visit(ctx.presetRegisters[i], specs);
                if (registerNames.has(register.name)) {
                    throw new Error(`Readonly register ${register.name} is defined more than once`);
                }
                else if (register.index !== i) {
                    throw new Error(`Readonly register ${register.name} is declared out of order`);
                }
                registerNames.add(register.name);
                let registerIndex = Number.parseInt(register.name.slice(2), 10);
                presetRegisters[registerIndex] = { pattern: register.pattern, values: register.values!, binary: register.binary };
            }
        }

        const secretRegisters: InputRegisterSpecs[] = [];
        if (ctx.secretRegisters) {
            for (let i = 0; i < ctx.secretRegisters.length; i++) {
                let register: ReadonlyRegisterDeclaration = this.visit(ctx.secretRegisters[i], specs);
                if (registerNames.has(register.name)) {
                    throw new Error(`Readonly register ${register.name} is defined more than once`);
                }
                else if (register.index !== i) {
                    throw new Error(`Readonly register ${register.name} is declared out of order`);
                }
                registerNames.add(register.name);
                let registerIndex = Number.parseInt(register.name.slice(2), 10);
                secretRegisters[registerIndex] = { pattern: register.pattern, binary: register.binary };
            }
        }

        const publicRegisters: InputRegisterSpecs[] = [];
        if (ctx.publicRegisters) {
            for (let i = 0; i < ctx.publicRegisters.length; i++) {
                let register: ReadonlyRegisterDeclaration = this.visit(ctx.publicRegisters[i], specs);
                if (registerNames.has(register.name)) {
                    throw new Error(`Readonly register ${register.name} is defined more than once`);
                }
                else if (register.index !== i) {
                    throw new Error(`Readonly register ${register.name} is declared out of order`);
                }
                registerNames.add(register.name);
                let registerIndex = Number.parseInt(register.name.slice(2), 10);
                publicRegisters[registerIndex] = { pattern: register.pattern, binary: register.binary };
            }
        }

        return { presetRegisters, secretRegisters, publicRegisters };
    }

    presetRegisterDefinition(ctx: any, specs: ScriptSpecs): ReadonlyRegisterDeclaration {
        const registerName = ctx.name[0].image;
        const registerIndex = Number.parseInt(registerName.slice(2), 10);
        const pattern = ctx.pattern[0].image;
        const values: bigint[] = this.visit(ctx.values);
        const binary: boolean = ctx.binary ? true : false;

        if (specs.steps % values.length !== 0) {
            throw new Error(`Invalid definition for readonly register ${registerName}: number of values must evenly divide the number of steps (${specs.steps})`);
        }

        if (binary) {
            for (let value of values) {
                if (value !== specs.field.zero && value !== specs.field.one) {
                    throw new Error(`Invalid definition for readonly register ${registerName}: the register can contain only binary values`);
                }
            }
        }

        return { name: registerName, index: registerIndex, pattern, binary, values };
    }

    secretRegisterDefinition(ctx: any, specs: ScriptSpecs): ReadonlyRegisterDeclaration {
        const registerName = ctx.name[0].image;
        const registerIndex = Number.parseInt(registerName.slice(2), 10);
        const pattern = ctx.pattern[0].image;
        const binary: boolean = ctx.binary ? true : false;
        return { name: registerName, index: registerIndex, binary, pattern };
    }

    publicRegisterDefinition(ctx: any, specs: ScriptSpecs): ReadonlyRegisterDeclaration {
        const registerName = ctx.name[0].image;
        const registerIndex = Number.parseInt(registerName.slice(2), 10);
        const pattern = ctx.pattern[0].image;
        const binary: boolean = ctx.binary ? true : false;
        return { name: registerName, index: registerIndex, binary, pattern };
    }

    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    transitionFunction(ctx: any, specs: ScriptSpecs): Function {
        const sc = new StatementContext(specs, false);
        const statements: StatementBlock = this.visit(ctx.statements, sc);
        if (statements.outputSize !== sc.mutableRegisterCount) {
            if (sc.mutableRegisterCount === 1) {
                throw new Error(`Transition function must evaluate to exactly 1 value`);
            }
            else {
                throw new Error(`Transition function must evaluate to a vector of exactly ${sc.mutableRegisterCount} values`);
            }
        }
        return new Function('f', 'g', 'r', 'k', 's', 'p', 'out', statements.code);
    }

    transitionConstraints(ctx: any, specs: ScriptSpecs): Function {
        const sc = new StatementContext(specs, true);
        const statements: StatementBlock = this.visit(ctx.statements, sc);
        if (statements.outputSize !== specs.constraintCount) {
            if (specs.constraintCount === 1) {
                throw new Error(`Transition constraints must evaluate to exactly 1 value`);
            }
            else {
                throw new Error(`Transition constraints must evaluate to a vector of exactly ${specs.constraintCount} values`);
            }
        }
        return new Function('f', 'g', 'r', 'n', 'k', 's', `p`, 'out', statements.code);
    }

    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statementBlock(ctx: any, sc: StatementContext): StatementBlock {

        let code = '';
        if (ctx.statements) {
            for (let i = 0; i < ctx.statements.length; i++) {
                let statement: Statement = this.visit(ctx.statements[i], sc);
                let expression = statement.expression;
                let variable = sc.buildVariableAssignment(statement.variable, expression.dimensions);
                code += `${variable.code} = ${expression.code};\n`;
            }
        }

        const out: Expression = this.visit(ctx.outStatement, sc);
        code += out.code;
        
        return { code, outputSize: out.dimensions[0] };
    }

    statement(ctx: any, sc: StatementContext): Statement {
        const variable = ctx.variableName[0].image;
        const expression = this.visit(ctx.expression, sc);
        return { variable, expression };
    }

    outStatement(ctx: any, sc: StatementContext): Expression {
        let code = '', dimensions: Dimensions;
        if (ctx.expression) {
            const expression: Expression = this.visit(ctx.expression, sc);
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
                let expression = this.visit(ctx.expressions[i], sc);
                if (!isScalar(expression.dimensions)) {
                    throw new Error(`Out vector elements must be scalars`);
                }
                code += `out[${i}] = ${expression.code};\n`;
            }
        }

        return { code, dimensions };
    }

    // WHEN STATEMENT
    // --------------------------------------------------------------------------------------------
    whenStatement(ctx: any, sc: StatementContext): StatementBlock {
        const registerName: string = ctx.condition[0].image;
        const registerRef = sc.buildRegisterReference(registerName);

        if (!sc.isBinaryRegister(registerName)) {
            throw new Error('When statement condition must be based on a binary register');
        }
        
        // create expressions for k and for (1 - k)
        const regExpression: Expression = { code: registerRef, dimensions: [0, 0] };
        const oneMinusReg = subHandler.getResult({ code: 'f.one', dimensions: [0, 0] }, regExpression);

        // build functions for true and false branches
        const tBlock: StatementBlock = this.visit(ctx.tBlock, sc);
        const tFunction = `function tBranch(f, g, r, k, s, p, out) {\n${tBlock.code}}`;  // TODO: make work for constraints as well
        const outputSize = tBlock.outputSize;
        const resultDim: Dimensions = [outputSize, 0];

        const fBlock: StatementBlock = this.visit(ctx.fBlock, sc);
        const fFunction = `function fBranch(f, g, r, k, s, p, out) {\n${fBlock.code}}`;  // TODO: make work for constraints as well

        let code = `let tOut = new Array(${outputSize}), fOut = new Array(${outputSize});\n`;
        code += `tBranch(f, g, r, k, s, p, tOut);\n`;   // TODO: make work for constraints as well
        code += `fBranch(f, g, r, k, s, p, fOut);\n`;   // TODO: make work for constraints as well
        code += `tOut = ${mulHandler.getCode({ code: 'tOut', dimensions: resultDim }, regExpression)};\n`;
        code += `fOut = ${mulHandler.getCode({ code: 'fOut', dimensions: resultDim }, oneMinusReg)};\n`;
        for (let i = 0; i < outputSize; i++) {
            code += `out[${i}] = f.add(tOut[${i}], fOut[${i}]);\n`;
        }
        code += `${tFunction}\n`;
        code += `${fFunction}\n`;
        
        return { code, outputSize };
    }

    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    vector(ctx: any, sc: StatementContext): Expression {

        const dimensions: Dimensions = [ctx.elements.length, 0];
        let code = `[`;
        for (let i = 0; i < ctx.elements.length; i++) {
            let element: Expression = this.visit(ctx.elements[i], sc);
            if (!isScalar(element.dimensions)) {
                if (isVector(element.dimensions) && element.destructured) {
                    dimensions[0] += (element.dimensions[0] - 1);
                }
                else {
                    throw new Error('Vector elements must be scalars');
                }
            }
            code += `${element.code}, `;
        }
        code = code.slice(0, -2) + ']';

        return { dimensions, code };
    }

    vectorDestructuring(ctx: any, sc: StatementContext): Expression {
        const variableName = ctx.vectorName[0].image;
        const element = sc.buildVariableReference(variableName);
        if (isScalar(element.dimensions)) {
            throw new Error(`Cannot expand scalar variable '${variableName}'`);
        }
        else if (isMatrix(element.dimensions)) {
            throw new Error(`Cannot expand matrix variable '${variableName}'`);
        }

        return {
            code        : `...${element.code}`,
            dimensions  : element.dimensions,
            destructured: true
        };
    }

    matrix(ctx: any, sc: StatementContext): Expression {

        const rowCount = ctx.rows.length;
        let colCount = 0;

        let code = `[`;
        for (let i = 0; i < rowCount; i++) {
            let row: Expression = this.visit(ctx.rows[i], sc);
            if (colCount === 0) {
                colCount = row.dimensions[0];
            }
            else if (colCount !== row.dimensions[0]) {
                throw new Error('All matrix rows must have the same number of columns');
            }
            code += `${row.code}, `;
        }
        code = code.slice(0, -2) + ']';

        return { dimensions: [rowCount, colCount], code };
    }

    matrixRow(ctx: any, sc: StatementContext): Expression {

        const dimensions: Dimensions = [ctx.elements.length, 0];
        let code = `[`;
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i], sc);
            if (!isScalar(element.dimensions)) throw new Error('Matrix elements must be scalars');
            code += `${element.code}, `;
        }
        code = code.slice(0, -2) + ']';

        return { dimensions, code };
    }

    // EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    expression(ctx: any, sc: StatementContext): Expression {
        return this.visit(ctx.addExpression, sc);
    }

    addExpression(ctx: any, sc: StatementContext): Expression {
        let result: Expression = this.visit(ctx.lhs, sc);

        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhs: Expression = this.visit(rhsOperand, sc);
                let opHandler = getOperationHandler(ctx.AddOp[i]);
                let dimensions = opHandler.getDimensions(result.dimensions, rhs.dimensions);
                let code = opHandler.getCode(result, rhs);
                result = { code, dimensions };
            });
        }

        return result;
    }

    mulExpression(ctx: any, sc: StatementContext): Expression {
        let result: Expression = this.visit(ctx.lhs, sc);

        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhs: Expression = this.visit(rhsOperand, sc);
                let opHandler = getOperationHandler(ctx.MulOp[i]);
                let dimensions = opHandler.getDimensions(result.dimensions, rhs.dimensions);
                let code = opHandler.getCode(result, rhs);
                result = { code, dimensions };
            });
        }

        return result;
    }

    expExpression(ctx: any, sc: StatementContext): Expression {
        let result: Expression = this.visit(ctx.lhs, sc);

        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhs: Expression = this.visit(rhsOperand, sc);
                let opHandler = getOperationHandler(ctx.ExpOp[i]);
                let dimensions = opHandler.getDimensions(result.dimensions, rhs.dimensions);
                let code = opHandler.getCode(result, rhs);
                result = { code, dimensions };
            });
        }

        return result;
    }

    atomicExpression(ctx: any, sc: StatementContext): Expression {
        if (ctx.parenExpression) {
            return this.visit(ctx.parenExpression, sc);
        }
        else if (ctx.conditionalExpression) {
            return this.visit(ctx.conditionalExpression, sc);
        }
        else if (ctx.Identifier) {
            const variable = ctx.Identifier[0].image;
            return sc.buildVariableReference(variable);
        }
        else if (ctx.MutableRegister) {
            const register = ctx.MutableRegister[0].image;
            return { code: sc.buildRegisterReference(register), dimensions: [0,0] };
        }
        else if (ctx.PresetRegister) {
            const register = ctx.PresetRegister[0].image;
            return { code: sc.buildRegisterReference(register), dimensions: [0,0] };
        }
        else if (ctx.SecretRegister) {
            const register = ctx.SecretRegister[0].image;
            return { code: sc.buildRegisterReference(register), dimensions: [0,0] };
        }
        else if (ctx.PublicRegister) {
            const register = ctx.PublicRegister[0].image;
            return { code: sc.buildRegisterReference(register), dimensions: [0,0] };
        }
        else if (ctx.IntegerLiteral) {
            const value = ctx.IntegerLiteral[0].image;
            return { code: `${value}n`, dimensions: [0,0] };
        }
        else {
            throw new Error('Invalid expression syntax');
        }
    }

    parenExpression(ctx: any, sc: StatementContext): Expression {
        return this.visit(ctx.expression, sc);
    }

    conditionalExpression(ctx: any, sc: StatementContext): Expression {
        const registerName = ctx.register[0].image;
        const registerRef = sc.buildRegisterReference(registerName);
        
        if (!sc.isBinaryRegister(registerName)) {
            throw new Error('Conditional expression can be based only on binary registers');
        }
        
        // create expressions for k and for (1 - k)
        const scalarDim: Dimensions = [0, 0];
        const regExpression: Expression = { code: registerRef, dimensions: scalarDim };
        const oneExpression: Expression = { code: 'f.one', dimensions: scalarDim };
        const oneMinusReg: Expression = {
            code        : subHandler.getCode(oneExpression, regExpression),
            dimensions  : scalarDim
        };

        // get expressions for true and false options
        const tExpression: Expression = this.visit(ctx.tExpression, sc);
        const dimensions = tExpression.dimensions;
        const fExpression: Expression = this.visit(ctx.fExpression, sc);
        if (!areSameDimension(dimensions, fExpression.dimensions)) {
            throw new Error('Conditional expression options must have the same dimensions');
        }

        // compute tExpression * k + fExpression * (1 - k)
        const tCode = mulHandler.getCode(tExpression, regExpression);
        const fCode = mulHandler.getCode(fExpression, oneMinusReg);
        const code = addHandler.getCode({ code: tCode , dimensions }, { code: fCode, dimensions });

        return { dimensions, code };
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
            throw new Error('Invalid expression syntax');
        }
    }

    literalParenExpression(ctx: any): bigint {
        return this.visit(ctx.literalExpression);
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