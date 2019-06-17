# AirScript
This library contains grammar rules and provides a simple parser for AirScript - a language for defining Arithmetic Intermediate Representation (AIR) of computations. AIR is used in [zk-STARKs](https://eprint.iacr.org/2018/046.pdf) to define transition functions and constraints.

### Motivation
Writing out transition functions and constraints, even for moderately complex STARKs, is extremely tedious and error-prone. AirScript aims to provide a higher-level language to simplify this task.

### Usage
This module is not intended for standalone use, but is rather a core component of the [genSTARK](https://github.com/GuildOfWeavers/genSTARK) library. Nevertheless, you can install it separately like so:
```bash
$ npm install @guildofweavers/air-script --save
```

# AirScript syntax

The example below defines a STARK for MiMC computation. This is similar to the computation described by Vitalik Buterin in his [blog post](https://vitalik.ca/general/2018/07/21/starks_part_3.html) about STARKs.

```
define MiMC over prime field (2^256 - 351 * 2^32 + 1) {

    // global constants used in transition function and constraint computations
    alpha: 3;

    // transition function definition
    transition 1 register in 2^13 steps {
        out: $r0^alpha + $k0;
    }

    // transition constraint definition
    enforce 1 constraint of degree 3 {
        out: $n0 - ($r0^alpha + $k0);
    }

    // readonly registers accessible in transition function and constraints
    using 1 readonly register {
        $k0: repeat [
            42, 43, 170, 2209, 16426, 78087, 279978, 823517, 2097194, 4782931,
            10000042, 19487209, 35831850, 62748495, 105413546, 170859333
        ];
    }
}
```

## STARK declaration
Every STARK definition in AirScript starts with a declaration:
```
define [name] over [field] { ... }
```
where:

* **name** specifies the name of the STARK. The name can contain letters, numbers, and underscores, and must start with a letter.
* **field** defines a finite field for all mathematical operations in the computation. Currently, only prime fields are supported. A field can be defined like so:
  * Prime field : `prime field (modulus)`

The body of a STARK is placed between curly braces following the declaration. The elements of the body are described below.

## Global constants
Global constants are used to bind constant values to names. Once a global constant is defined, you can reference it by name in transition functions and constraints. In some ways, global constants are similar to instance variables of classes in object-oriented programming. But unlike instance variables, values of global constants cannot be changed.

Values of global constants can be of 3 types: ***scalars***, ***vectors***, and ***matrixes***. Here are a few examples:
```
a: 123;                     // scalar constant
V: [1, 2, 3];               // vector with 3 elements
M: [[1, 2, 3], [4, 5, 6]];  // 2x3 matrix
```
Names of global constants must adhere to the following convention:

* Names can contain letters, numbers, and underscores and must start with a letter;
* Letters in scalar constant names must be all lower-case; 
* Letters in vector and matrix constant names must be all upper-case.

## Transition function
A core component of a STARK's definition is a state transition function. A transition function can be defined like so:
```
transition [number of registers] registers in [number of steps] steps { ... }
```
where:

* **number of registers** specifies the number of mutable registers which hold values of the computation's execution trace.
* **number of steps** specifies the number of times the transition function should be applied to the initial inputs to complete the computation.

The body of the transition function is a series of [arithmetic statements](#Arithmetic-statements) which evaluate to the next state of the computation. For example:
```
out: $r0 + $k0 + 1;
```
This statement says: the next value of *mutable* register `$r0` is equal to the current value of the register, plus the current value of readonly register `$k0`, plus 1.

If your computation involves more than 1 mutable register, your transition function should return a vector with values for the next state of all registers. Here is an example:
```
a0: $r0 + $r1;
a1: a0 + $r1;
out: [a0, a1];
```
The above example describes a state transition function that operates over 2 registers:

* The next value of register `$r0` is set to the sum of the current values of both registers;
* The next value of register `$r1` is set to the same sum plus current value of register `$r1` again.

(this is actually a somewhat convoluted way to describe a transition function for a Fibonacci sequence).

In general, the length of the vector in the `out` statement must be equal to the number of mutable registers specified in the declaration of the transition function block.

## Transition constraints
Another core component of a STARK's definition is a set of transition constraints. A computation is considered valid only if transition constraints are satisfied for all steps (except the last one). Transition constraints can be defined like so:
```
enforce [number of constraints] constraints of degree [max constraint degree] { ... }
```
where:

* **number of constraints** specifies the number of constraints needed to describe the computation.
* **max constraint degree** specifies the highest algebraic degree used in constraint computations. For example, if you raise value of some register to power 3 (or perform equivalent computations), max constraint degree should be set to 3.

Similarly to transition functions, the body of transition constraints consists of a series of [arithmetic statements](#Arithmetic-statements). However, unlike transition functions, transition constraints can reference future states of mutable registers. For example:
```
out: $n0 - ($r0 + $k0 + 1);
```
where `$n0` contains value of register `$r0` at the next step of computation.

If you are working with more than one constraint, your transition constraint statements should return a vector with evaluations for all of your constraints. For example:
```
a0: $r0 + $r1;
out: [$n0 - a0, $n1 - ($r1 + a0)];
```
(these are constraints matching the Fibonacci transition function described previously).

In general, the length of the vector in the `out` statement must be equal to the number of constraints specified in the declaration of the transition constraints bock.

## Arithmetic statements
Bodies of transition functions and constraints are nothing more than a series of arithmetic statements (separated by semicolons) which evaluate to a number or to a vector of numbers. Here is an example:

```
a0: $r0 + $r1;
a1: $k0 * a0;
out: [a0, a1];
```
Here is what this means:

* Define variable `a0` to be the sum of values from *mutable* registers `$r0` and `$r1`.
* Define variable `a1` to be the product of value from *readonly* register `$k0` and variable `a0`.
* Set the return value of the statements to a vector of two elements with values of `a0` and `a1` being first and second elements respectively.

Every arithmetic statement is an *assignment* statement. It assigns a value of an expression (the right side) to a variable (left side). Every list of statements must terminate with an `out` statement which defines the return value of the statements.

Within the statements you can reference registers, constants, variables, and perform arithmetic operations with them. All of this is described below.

### Registers
A computation's execution trace consists of a series of state transitions. A state of a computation at a given step is held in an array of registers. There are two types of registers:

* **mutable** registers - values in these registers are defined by the state [transition function](#Transition-function).
* **readonly** registers - values in these registers are defined by the [readonly register definitions](#Readonly-registers).

To reference a given register you need to specify the name of the register bank and the index of the register within that bank. Names of all register banks start with `$` - so, register references can look like this: `$r1`, `$k23`, `$n11` etc. Currently, there are 3 register banks:

* **$r** bank holds values of *mutable* registers for the current step of the computation.
* **$n** bank holds values of *mutable* registers for the next step of the computation. This bank can be referenced only in transition constraints (not in the transition function).
* **$k** bank holds values of *readonly* registers for the current step of the computation.

### Variables
To simplify your scripts you can aggregate common computations into variables. Once a variable is defined, it can be used in all subsequent statements. You can also change the value of a variable by re-assigning to it. For example, something like this is perfectly valid:
```
a0: $r0 + 1;
a0: a0 + $r1;
out: a0;
```
Variable can be of 3 different types: ***scalars***, ***vectors***, and ***matrixes***.

#### Scalars
A variable that holds a simple numerical value is a scalar. Implicitly, all registers hold scalar values. All constant literals are also scalars. A name of scalar variable can include lower-case letters, numbers, and underscores (and must start with a letter). Here are a few examples:
```
a0: 1;
foo: $r0;
foo_bar: $r0 + 1;
```

#### Vectors
Scalars can be aggregated into vectors (a vector is just a 1-dimensional array). You can define a vector by putting a comma-separated list of scalars between square brackets. A name of a vector variable can include upper-case letters, numbers, and underscores (and must start with a letter). Here are a few examples:
```
V0: [1, 2];
FOO: [$r0, $r1];
FOO_BAR: [$r0, $r1 + 1, $k0];
```

#### Matrixes
A matrix is a 2-dimensional array of scalars. Similarly to vectors, matrix variable names can include upper-case letters, numbers, and underscores. You can define a matrix by listing its elements in a row-major form. Here are a couple of examples:
```
M0: [[1, 2], [1, 2]];
FOO: [[$k0, $r0, 1], [$r1 + $r2, 42, $r3 * 8]];
```

### Operations
To do something useful with registers, variables etc. you can apply arithmetic operations to them. These operations are `+`, `-`, `*`, `/`, `^`.

When you work with scalar values, these operations behave as you've been taught in the elementary school (though, the math takes place in a finite field). But you can also apply these operations to vectors and matrixes. In such cases, these are treated as **element-wise** operations. Here are a few examples:
```
V0: [1, 2];
V1: [3, 4];
V2: V0 + V1;    // result is [4, 6]
v2: V1^2;       // result is [9, 16]
```
You can also replace the second operand with a scalar. Here is how it'll work:
```
V0: [1, 2];
V1: V0 * 2;     // result is [2, 4]
```
One important thing to note: if both operands are vectors, the operations make sense only if vectors have the same dimensions (i.e. you can't do element-wise addition between vectors of different lengths).

Even though the examples above focus on vectors, you can apply the same operations to matrixes (of same dimensions), and they'll work in the same way.

There is one additional operation we can apply to vectors and matrixes (but not to scalars): `#`. The meaning of this operation is as follows:

* **matrix # matrix** - performs a standard [matrix multiplication](https://en.wikipedia.org/wiki/Matrix_multiplication) of two matrixes. If the input matrixes have dimensions [*n*,*p*] and [*p*,*m*], the output matrix will have dimensions [*n*,*m*].
* **matrix # vector** - also performs matrix multiplication, but the output is a vector. If the input matrix dimensions are [*n*,*m*], and the length of the input vector is *m*, the output vector will have length *n*.
* **vector # vector** - performs a [linear combination](https://en.wikipedia.org/wiki/Linear_combination) of two vectors. Vectors must have the same length, and the output is a scalar.

**Note:** unary `-` operation is not currently supported.

## Readonly registers

In addition to mutable registers, you can define STARKs with readonly registers. A readonly register is a register whose value cannot be changed by a transition function. You can reference readonly registers in your transition functions and constraints by using the `$k` prefix. For example, `$k0`, `$k1`, `$k2` etc.

Readonly registers can be defined like so:
```
using [number of registers] readonly registers { ... }
```
where:

* **number of registers** specifies the number of readonly registers.

The body of the readonly registers block must contain definitions for all readonly registers specified in the declaration. A register can be defined like so:
```
$k[register index]: [pattern] [values];
```
where, `values` is an array of constant values for the register, and `pattern` is a flag indicating how the values will appear in the register. For example:
```
$k0: repeat [...];
$k1: spread [...];
```

Currently, `pattern` can be one of the following: 

* **repeat** - the values will be "cycled" during execution. For example, if `values = [1, 2, 3, 4]`, and the execution trace is 16 steps long, the values will appear in the execution trace as: `[1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4]`.
* **spread** - the values will be "spread" during execution. For example, if `values = [1, 2, 3, 4]`, and the execution trace is 16 steps long, the values will appear as: `[1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 4, 0, 0, 0]`.

## Comments
To annotate your scripts with comments, use `//`. Anything following `//` until the end of the line will not be processed by the parser. Currently, this is the only style of comments supported.

# API
This module exposes a single `parseScript()` method. The method has the following signature:
```TypeScript
parseScript(text: string, limits?: StarkLimits): StarkConfig;
```
where `text` is the text of the script, and `limits` is an optional object that specifies the following limits:

| Property             | Description |
| -------------------- | ----------- |
| maxSteps             | Maximum number of steps for transition functions; the default is 2^20. |
| maxMutableRegisters  | Maximum number of mutable registers; the default is 64. |
| maxReadonlyRegisters | Maximum number of readonly registers; the default is 64. |
| maxConstraintCount   | Maximum number of transition constraints; the default is 1024. |
| maxConstraintDegree  | Maximum degree of transition constraints; the default is 16. |

If parsing of the script is successful, the `parseScript()` method returns a `StarkConfig` object with the following properties:

| Property             | Description |
| -------------------- | ----------- |
| name                 | Name from the STARK declaration. |
| field                | Finite field specified for the computation. |
| steps                | Number of steps specified for the computation. |
| mutableRegisterCount | Number of mutable registers defined for the computation. |
| readonlyRegisters    | Definitions of readonly registers specified for the computation. |
| constraintCount      | Number of transition constraints specified for the computation. |
| transitionFunction   | A JavaScript function which given the current state, computes the next state of the computation's execution trace. |
| constraintEvaluator  | A JavaScript function which given the current and the next state of the computation, evaluates transition constraints. |
| maxConstraintDegree  | Maximum algebraic degree specified for the transition constraints. |
| globalConstants      | An object containing values of the defined global constants. |

If parsing of the script fails, the `parseScript()` method throws an `AirScriptError` which contains a list of errors (under `.errors` property) that caused the failure.

# License
[MIT](/LICENSE) © 2019 Guild of Weavers