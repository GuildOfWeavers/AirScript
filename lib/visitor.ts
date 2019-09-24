// IMPORTS
// ================================================================================================
import { StarkLimits, ConstraintSpecs } from '@guildofweavers/air-script';
import { AirConfig, TransitionFunction, ConstraintEvaluator } from './AirObject';
import { FiniteField, createPrimeField, WasmOptions } from '@guildofweavers/galois';
import { tokenMatcher } from 'chevrotain';
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
        if (ctx.staticRegisters) {
            for (let i = 0; i < ctx.staticRegisters.length; i++) {
                let register: ReadonlyRegisterDeclaration = this.visit(ctx.staticRegisters[i], specs);
                if (registerNames.has(register.name)) {
                    throw new Error(`Readonly register ${register.name} is defined more than once`);
                }
                else if (register.index !== i) {
                    throw new Error(`Readonly register ${register.name} is declared out of order`);
                }
                registerNames.add(register.name);
                let registerIndex = Number.parseInt(register.name.slice(2), 10);
                staticRegisters[registerIndex] = { pattern: register.pattern, values: register.values!, binary: register.binary };
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

        return { staticRegisters, secretRegisters, publicRegisters };
    }

    staticRegisterDefinition(ctx: any, specs: ScriptSpecs): ReadonlyRegisterDeclaration {
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
        const out: Expression = this.visit(ctx.outStatement, exc);
        return new StatementBlock(out, statements);
    }

    statement(ctx: any, exc: ExecutionContext): Statement {
        const expression = this.visit(ctx.expression, exc);
        const variable = exc.setVariableAssignment(ctx.variableName[0].image, expression);
        return { variable, expression };
    }

    outStatement(ctx: any, exc: ExecutionContext): Expression {
        if (ctx.expression) {
            return this.visit(ctx.expression, exc);
        }
        else if (ctx.vector) {
            return this.visit(ctx.vector, exc);
        }
        else {
            throw new Error(''); // TODO
        }
    }

    // WHEN STATEMENT
    // --------------------------------------------------------------------------------------------
    whenStatement(ctx: any, exc: ExecutionContext): Expression {
        const registerName: string = ctx.condition[0].image;
        const registerRef = exc.getRegisterReference(registerName);

        // make sure the condition register holds only binary values
        if (!exc.isBinaryRegister(registerName)) {
            throw new Error(`when...else statement condition must be based on a binary register`);
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
        const variableName = ctx.vectorName[0].image;
        const element = exc.getVariableReference(variableName);
        return new expressions.DestructureVector(element);
    }

    vectorRangeSelector(ctx: any, exc: ExecutionContext): Expression {
        const variableName = ctx.vectorName[0].image;
        const rangeStart = Number.parseInt(ctx.rangeStart[0].image, 10);
        const rangeEnd = Number.parseInt(ctx.rangeEnd[0].image, 10);
        const element = exc.getVariableReference(variableName);
        return new expressions.SliceVector(element, rangeStart, rangeEnd);
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
        return this.visit(ctx.addExpression, exc);
    }

    addExpression(ctx: any, exc: ExecutionContext): Expression {
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
        let result: Expression = this.visit(ctx.lhs, exc);

        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhs: Expression = this.visit(rhsOperand, exc);
                result = expressions.BinaryOperation.exp(result, rhs);
            });
        }

        return result;
    }

    atomicExpression(ctx: any, exc: ExecutionContext): Expression {
        if (ctx.parenExpression) {
            return this.visit(ctx.parenExpression, exc);
        }
        else if (ctx.vectorRangeSelector) {
            return this.visit(ctx.vectorRangeSelector, exc);
        }
        else if (ctx.Identifier) {
            const variable = ctx.Identifier[0].image;
            return exc.getVariableReference(variable);
        }
        else if (ctx.MutableRegister) {
            const register = ctx.MutableRegister[0].image;
            return exc.getRegisterReference(register);
        }
        else if (ctx.StaticRegister) {
            const register = ctx.StaticRegister[0].image;
            return exc.getRegisterReference(register);
        }
        else if (ctx.SecretRegister) {
            const register = ctx.SecretRegister[0].image;
            return exc.getRegisterReference(register);
        }
        else if (ctx.PublicRegister) {
            const register = ctx.PublicRegister[0].image;
            return exc.getRegisterReference(register);
        }
        else if (ctx.IntegerLiteral) {
            const value: string = ctx.IntegerLiteral[0].image;
            return new expressions.LiteralExpression(value);
        }
        else {
            throw new Error('Invalid expression syntax');
        }
    }

    parenExpression(ctx: any, exc: ExecutionContext): Expression {
        return this.visit(ctx.expression, exc);
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