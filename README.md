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

    // constants used in transition function and constraint computations
    alpha: 3;

    // transition function definition
    transition 1 register {
        for each ($i0) {
            init $i0;
            for steps [1...8192] {
                $r0^alpha + $k0;
            }
        }
    }

    // transition constraint definition
    enforce 1 constraint {
        for all steps {
            transition($r) = $n;
        }
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
Global constants are used to bind constant values to names. Once a global constant is defined, you can reference it by name in transition functions and constraints.

Values of global constants can be of 3 types: ***scalars***, ***vectors***, and ***matrixes***. Here are a few examples:
```
a: 123;                     // scalar constant
V: [1, 2, 3];               // vector with 3 elements
M: [[1, 2, 3], [4, 5, 6]];  // 2x3 matrix
```
Names of statics constants must adhere to the following convention:

* Names can contain letters, numbers, and underscores and must start with a letter;
* Letters in scalar constant names must be all lower-case; 
* Letters in vector and matrix constant names must be all upper-case.

## Transition function
A core component of a STARK's definition is a state transition function. A transition function can be defined like so:
```
transition [number of registers] registers { ... }
```
where:

* **number of registers** specifies the number of mutable registers which hold values of the computation's execution trace.

The body of a transition function is defined by an [input loop](#Input-loops) which, given the current state, evaluates to the next state of the computation. For example:
```
transition 1 register {
    for each ($i0) {
        init $i0;
        for steps [1..31] {
            $r0 + $k0 + 1;
        }
    }
}
```
This transition function works with a single *mutable* register (`$r0`) and a single *readonly* register (`$k0`), and does the following:

1. Initializes the the value of `$r0` to be the value passed in via [input register](#Input-registers) `$i0`.
2. For 31 steps, computes the next value of `$r0` as: the current value of `$r0`, plus the current value of `$k0`, plus 1.

If your computation involves more than 1 mutable register, your transition function should return a vector with values for the next state for all registers. Here is an example:
```
transition 2 registers {
    for each ($i0) {
        init [$i0, $i0];
        for steps [1..31] {
            a0 <- $r0 + $r1;
            a1 <- a0 + $r1;
            [a0, a1];
        }
    }
```
The above example describes a state transition function that operates over 2 registers (`$r0` and `$r1`):

* Both registers are initialized to the same value.
* The next value of register `$r0` is set to the sum of the current values of both registers;
* The next value of register `$r1` is set to the same sum plus current value of register `$r1` again.

(this is actually a somewhat convoluted way to describe a transition function for a Fibonacci sequence).

In general, the length of the vector to which the transition function resolves must be equal to the number of mutable registers specified in the declaration of the transition function.

## Transition constraints
Another core component of a STARK's definition is a set of transition constraints. A computation is considered valid only if transition constraints are satisfied for all steps (except the last one). Transition constraints can be defined like so:
```
enforce [number of constraints] constraints { ... }
```
where:

* **number of constraints** specifies the number of constraints needed to describe the computation.

Similarly to transition functions, the body of transition constraints is defined by an [input loop](#Input-loops). But, there are a few differences.

First, unlike transition functions, transition constraints can reference future states of mutable registers. For example:
```
enforce 1 constraint {
    for each ($i0) {
        init $n0 - $i0;
        for steps [1..31] {
            $n0 - ($r0 + $k0 + 1);
        }
    }
```
where `$n0` contains value of register `$r0` at the next step of the computation.

Second, you can use comparison operator (`=`) to add clarity to the the constraints. So, the above example can be re-written as:
```
enforce 1 constraint {
    for each ($i0) {
        init $i0 = $n0;
        for steps [1..31] {
            $r0 + $k0 + 1 = $n0;
        }
    }
```

Thirds, if your constraints don't do anything fancy and just compare current and next state of the execution trace, you can write them simply like this:
```
enforce 1 constraint {
    for all steps {
        transition($r) = $n;
    }
}
```
This wil evaluate as:

1. First apply the transition function to the current state;
2. Then subtract the resulting values from `$n` register bank and return the result.

### Constraint degree
One of the key components of proof complexity is the arithmetic degree of transition constraints. AirScript automatically infers the degree of each constraint based on the arithmetic operations performed. But it is important to keep this degree in mind lest it becomes too large. Here are a few pointers:

* All registers (*mutable* and *readonly*) have a degree of `1`.
* Raising an expression to a power increases the degree of the expression by that power. For example, the degree of `$r0^3` is `3`.
* Multiplying an expression by a register raises the degree of the expression by `1`. For example, the degree of `($r0 + 2) * $k0` is `2`.
* Using [conditional expressions](#Conditional-expressions) increases the degree of the expression by `1`.
* Both input and segment loops increase the degree as log<sub>2</sub>(n), where n is the number of loops. So, for example, if your constraints consists of one input loop and one segment loop, the degree will increase by 1.

## Loops
Loop constructs in AirScript are somewhat different from loops in regular programming languages. For example, loops in AirScript always resolve to a single value for a single iteration (this value could be a number or a vector of numbers). In a way, loops allow you to define blocks of [arithmetic statements](#arithmetic-statements) which should be evaluated at specific steps. Currently, AirScript support two types of loops:

1. `for each` loops or [input loops](#Input-loops) which iterate over sets of inputs.
2. `for steps` loops or [segment loops](#Segment-loops) which iterate over segments of execution trace.

### Input loops
Transition functions and transition constraints contain a single top-level input loop. This loop specifies what inputs are to be expected, and how these inputs are to be used to initialize the execution trace. You can define an input loop like so:
```
for each ([list of registers]) { ... }
```
where:

* **list of registers** is a comma-separated list of [input registers](#Input-registers).

A body of an input loop must have an `init` clause, which should be followed by one or more segment loops (input loops can also be [nested](#Nested-input-loops)). Here is an example:
```
for each ($i0) {
    init { [$i0, $i0 * 2] }

    for steps [1..31] { $r^2 }
    for steps [32..63] { $r^3 }
}
```
Here is what's happening here:

* The loop expects a single input register `$i0`;
* The execution trace has 2 registers. The first register is initialized to the value of `$i0` and the second one is initialized to 2 * `$i0`;
* Then, for 31 steps, state transition is defined as squaring of the values in each of the registers.
* Then, for 32 more steps, state transition is defined as cubing of values in each of the registers.

A couple of things to note:

* `$i` registers can be referenced only within the `init` clause. Referencing them anywhere else will result in an error.
* The `init` clause of the top-level loop cannot reference any other registers besides the `$i` registers (this is not the case for nested loops).

#### Nested input loops
Input loops can be nested to a significant depth (though, the greeter is the depth, the higher is the arithmetic degree of transition function/constraints). Here is an example of how this would look like:
```
for each ($i0, $i1) {
    init { ... }

    for each ($i1) {
        init { ... }

        for steps [1..31] { ... }
        for steps [32..63] { ... }
    }
}
```
In this example, two input registers are defined such that for every value provided in the `$i0` register, multiple values are expected to be provided in the `$i1` register (you can say that a relationship between them is "one-to-many"). Here is how valid inputs for this loop could look like:
```
[
    [1, [1, 2]],  // $i0 = 1, $i1 = [1, 2]
    [2, [3, 4]]   // $i0 = 2, $i1 = [3, 4]
]
```
To understand how these inputs are consumed by the code, imagine a tape with two columns that looks like so:

| $i0 | $i1 |
| :-: | :-: |
| 1   | 1   |
|     | 2   |
| 2   | 3   |
|     | 4   |

This tape is consumed one row at a time. Whenever values for both `$i0` and `$i1` are present, the `init` clause of the out loop is executed. But when only value for `$i1` is available, the `init` clause of the inner loop is executed instead. In either case, after an `init` clause is executed, the segment loops are executed for the specified number of steps (in this case for 63 steps total). So, the execution will unroll like so:

1. `init` clause of the outer loop is evaluated with `$i0=1, $i1=1`.
2. Segment loops are evaluated for a total of 63 steps.
3. `init` clause of the inner loop is evaluated with `$i1=2`.
4. Segment loops are evaluated for a total of 63 steps.
5. `init` clause of the outer loop is evaluated with `$i0=2, $i1=3`.
6. Segment loops are evaluated for a total of 63 steps.
7. `init` clause of the inner loop is evaluated with `$i1=4`.
8. Segment loops are evaluated for a total of 63 steps.

In the end, the execution trace for the above set of inputs will be 256 steps long.

One thing to note: when defining inner loops, the set of input registers must always narrow. For example, if you have loops nested 3 levels deep, the top level loop may operate with registers `($i0, $i1, $i2)`. The loop next level down must narrow this, for example, to `($i1, $i2)`. And the inner-most loop must down it further to just `($i2)`.

### Segment loops
Segment loops can be used to specify different state transition logic for different segments (groups of steps) of a computation. Here is how you can define a segment loop:
```
for steps [list of intervals] { ... }
```

where:

* **list of intervals** is a comma-separated list of step intervals. Each interval is specified by defining start and end points of the interval (both inclusive).

```
for steps [1..4, 60..62] { $r0^2 }
for steps [5..59, 63] { $r0^3 }
```
In this example, the transition logic is defined as follows:

* For steps 1 through 4 and 60 - 62 (7 steps total), the next value of `$r0` is defined as a square of its current value.
* For steps 5 through 59 and step 63 (56 steps total), the next value of `$r0` is defined as a cube of its current value.

A few things to keep in mind when defining intervals:

* A set of segment loops must fully define the entire execution trace. This means that you can't have "gap" steps for which transition logic is undefined (e.g. defining transition logic just for intervals [1..3] and [5..7] is invalid because step 4 is missing).
* You also can't have "overlapping" intervals. This means that each step must map unambiguously to state transition logic (e.g. defining transition logic for intervals [1..5] and [5..7] is invalid because transition logic for step 5 is ambiguous).
* One of the intervals must start with step `1`. This is because `init` clause of a parent input loop is executed at step `0`.
* Length of the execution trace defined by all intervals must be a power of 2. For example, [1..63] is valid because this implies 64 steps (including step `0`), but [1..62] is not.

## Arithmetic statements
Bodies of loops are nothing more than a series of arithmetic statements (separated by semicolons) which evaluate to a number or to a vector of numbers. Here is an example:

```
a0 <- $r0 + $r1;
a1 <- $k0 * a0;
[a0, a1];
```
Here is what this means:

* Define variable `a0` to be the sum of values from *mutable* registers `$r0` and `$r1`.
* Define variable `a1` to be the product of value from *readonly* register `$k0` and variable `a0`.
* Set the return value of the statement block to a vector of two elements with values of `a0` and `a1` being first and second elements respectively.

Every arithmetic statement is an *assignment* statement. The assignment operator (`<-`) assigns a value of an expression (the right side) to a variable (the left side). Every block of statements must terminate with expression which defines the return value of the entire block.

Within the statements you can reference registers, constants, variables, and perform arithmetic operations with them. All of this is described below.

### Registers
A computation's execution trace consists of a series of state transitions. A state of a computation at a given step is held in an array of registers. There are tree types of registers:

* **mutable** registers - values in these registers are defined by the state [transition function](#Transition-function).
* **readonly** registers - values in these registers are defined by the [readonly register definitions](#Readonly-registers).
* **input** registers - values for these registers are defined by the structure of the transition function as described [below](#Input-registers).

To reference a given register you need to specify the name of the register bank and the index of the register within that bank. Names of all register banks start with `$` - so, register references can look like this: `$r1`, `$k23`, `$n11` etc. You can also reference an entire register bank by omitting register index (e.t. `$r`, `$kn`, `$n`). In this case, the reference resolves to a vector of values.

Currently, there are 6 register banks:

* **$r** bank holds values of *mutable* registers for the current step of the computation.
* **$n** bank holds values of *mutable* registers for the next step of the computation. This bank can be referenced only in transition constraints (not in the transition function).
* **$k** bank holds values of static registers for the current step of the computation.
* **$p** bank holds values of public trace registers for the current step of the computation.
* **$s** bank holds values of secret trace registers for the current step of the computation.
* **$i** bank holds values of input registers at the current step of the computation.

#### Input registers
The number and depth of input registers depend on the structure of the transition function as defined by [input loops](#Input-loops). Specifically, the top-level input loop specifies all required input registers. The depth of input registers is defined by the [nesting](#Nested-input-loops) of input loops.

Input registers stand out somewhat as compared to other registers because they can be referenced only within `init` clauses of input loops.

### Variables
To simplify your scripts you can aggregate common computations into variables. Once a variable is defined, it can be used in all subsequent statements. You can also change the value of a variable by re-assigning to it. For example, something like this is perfectly valid:
```
a0 <- $r0 + 1;
a0 <- a0 + $r1;
a0;
```
Variable can be of 3 different types: ***scalars***, ***vectors***, and ***matrixes***.

#### Scalars
A variable that holds a simple numerical value is a scalar. Implicitly, all registers hold scalar values. All constant literals are also scalars. A name of scalar variable can include lower-case letters, numbers, and underscores (and must start with a letter). Here are a few examples:
```
a0 <- 1;
foo <- $r0;
foo_bar <- $r0 + 1;
```

#### Vectors
Scalars can be aggregated into vectors (a vector is just a 1-dimensional array). You can define a vector by putting a comma-separated list of scalars between square brackets. All register banks are also vectors. A name of a vector variable can include upper-case letters, numbers, and underscores (and must start with a letter). Here are a few examples:
```
V0 <- [1, 2];
FOO <- [$r0, $r1];
FOO_BAR <- [$r0, $r1 + 1, $k0];
```

##### Vector composition
You can combine multiple vectors into a single vector using destructuring syntax like so:
```
V0 <- [1, 2];
V1 <- [3, 4];
V3 <- [...V0, ...V1, 5]; // will contain [1, 2, 3, 4, 5]
```

##### Vector element extraction
You can extract a subset of elements from a vector like so:
```
A <- [1, 2, 3, 4];
b <- A[1];      // b is equal to 2
C <- A[2..3];   // C is equal to [3, 4]
```
#### Matrixes
A matrix is a 2-dimensional array of scalars. Similarly to vectors, matrix variable names can include upper-case letters, numbers, and underscores. You can define a matrix by listing its elements in a row-major form. Here are a couple of examples:
```
M0 <- [[1, 2], [1, 2]];
FOO <- [[$k0, $r0, 1], [$r1 + $r2, 42, $r3 * 8]];
```

### Operations
To do something useful with registers, variables etc. you can apply arithmetic operations to them. These operations are `+`, `-`, `*`, `/`, `^`.

When you work with scalar values, these operations behave as you've been taught in the elementary school (though, the math takes place in a finite field). But you can also apply these operations to vectors and matrixes. In such cases, these are treated as **element-wise** operations. Here are a few examples:
```
V0 <- [1, 2];
V1 <- [3, 4];
V2 <- V0 + V1;    // V2 is [4, 6]
v2 <- V1^2;       // V2 is [9, 16]
```
You can also replace the second operand with a scalar. Here is how it'll work:
```
V0 <- [1, 2];
V1 <- V0 * 2;     // V2 is [2, 4]
```
One important thing to note: if both operands are vectors, the operations make sense only if vectors have the same dimensions (i.e. you can't do element-wise addition between vectors of different lengths).

Even though the examples above focus on vectors, you can apply the same operations to matrixes (of same dimensions), and they'll work in the same way.

There is one additional operation we can apply to vectors and matrixes (but not to scalars): `#`. The meaning of this operation is as follows:

* **matrix # matrix** - performs a standard [matrix multiplication](https://en.wikipedia.org/wiki/Matrix_multiplication) of two matrixes. If the input matrixes have dimensions [*n*,*p*] and [*p*,*m*], the output matrix will have dimensions [*n*,*m*].
* **matrix # vector** - also performs matrix multiplication, but the output is a vector. If the input matrix dimensions are [*n*,*m*], and the length of the input vector is *m*, the output vector will have length *n*.
* **vector # vector** - performs a [linear combination](https://en.wikipedia.org/wiki/Linear_combination) of two vectors. Vectors must have the same length, and the output is a scalar.

#### Unary operations
Operators `-` and `/` can also be applied to a single operand, thus, becoming unary operators. Specifically, unary `-` computes an additive inverse (negation), and unary `/` computes a multiplicative inverse. Here are a few examples:
```
a <- 5;
b <- (-a);  // equivalent to computing 0 - a in the STARK's field
c <- (/a);  // equivalent to computing 1/a in the STARK's field
```
Unary operators can also be applied to vectors and matrixes to compute element-wise negations and inversions. For example:
```
A <- [1, 2];
B <- (-A);  // is equivalent to computing [0 - 1, 0 - 2]
C <- (/A);  // is equivalent to computing [1/1, 1/2]
```

### Conditional expressions
Sometimes you may want to set a value of a variable (or variables) predicated on some condition. To do this, you can use conditional expressions. AirScript supports two types of conditional expressions **ternary expression** and **when...else** statement.

#### Ternary expression
Using ternary expression you can set a value of a variable to one of two options where each option is a single expression. The syntax for the expression is:
```
[variable]: [selector] ? [expression 1] : [expression 2];
```
For example:
```
v <- $k0 ? ($r0 + $k1) : $r1;
```
The above is just syntactic sugar for writing something like this:
```
v <- ($r0 + $k1) * $k0 + $r1 * (1 - $k0);
```
The only restriction imposed by the ternary expression is that `selector` must be a [binary register](#Binary-registers).

#### When...else statement
`when...else` statements are similar to ternary expressions but now your options can be entire blocks of arithmetic expressions. The syntax for the statement is:
```
when ([selector]) {[block 1]} else {[block 2]}
```
For example:
```
A <- when ($k0) {
    a0 <- $r0 + $r1;
    a1 <- a0 + $r1;
    [a0, a1];
}
else {
    a0 <- $r0 - $r1;
    a1 <- a0 - $r1;
    [a0, a1];
}
```
Both blocks must resolve to a vector of the same length. Also, similarly to ternary expressions, the `selector` must be a [binary register](#Binary-registers).

In the above, `when...else` statement is equivalent to multiplying the result of evaluating `when` block by `$k0`, multiplying the result of `else` block by `1 - $k0`, and then performing an element-wise sum of resulting vectors.

You can also nest `when...else` to create more sophisticated selection conditions. For example:
```
A <- when ($k0) {
    when ($k1) {
        [$r0 + 1, $r0 - 1];
    }
    else {
        a0 <- $r0 + $r1;
        a1 <- a0 + $r1;
        [a0, a1];
    }
}
else {
    a0 <- $r0 - $r1;
    a1 <- a0 - $r1;
    [a0, a1];
}
```

## Readonly registers

In addition to mutable registers (`$r`, `$n`) and input registers (`$i`), you can define STARKs with readonly registers. A readonly register is a register whose value cannot be changed by a transition function. There are 3 types of readonly registers:

* **Static registers** - values for these registers are a part of STARK's definition. To reference these registers in transition function and transition constraints use `$k` prefix.
* **Public trace registers** - values for these registers are known both to the prover and to the verifier, and are provided when a proof is generated and when it is verified. To reference these registers in transition function and transition constraints use `$p` prefix.
* **Secret trace registers** - values for these registers are known only to the prover, and are provided only when a proof is generated. To reference these registers in transition function and transition constraints use `$s` prefix.

Readonly registers can be defined like so:
```
using [number of registers] readonly registers { ... }
```
where:

* **number of registers** specifies the total number of readonly registers.

The body of the readonly registers block must contain definitions for all readonly registers specified in the declaration. A register can be defined like so:
```
$[register bank][register index]: [pattern] binary? [values];
```
A few examples:
```
$k0: repeat [1, 2, 3, 4];
$k1: spread [1, 2, 3, 4];

$p0: repeat [...];

$s0: spread [...];
```

Registers of a given bank must be defined in order. That is `$k1` should go after `$k0`, `$k2` after `$k1` etc. But you don't need to group registers by their bank. For example, the following is perfectly valid:
```
$k0: repeat [1, 2, 3, 4];
$p0: repeat [...];
$k1: spread [1, 2, 3, 4];
```
Since values for public and secret trace registers are not known at the time of STARK definition, you can't provide them within the script. Instead, use `[...]` to indicate that the values will be provided at the time of proof generation and/or verification.


### Value pattern
Value pattern can be one of the following: 

* **repeat** - the values will be "cycled" during execution. For example, if `values = [1, 2, 3, 4]`, and the execution trace is 16 steps long, the values will appear in the execution trace as: `[1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4]`.
* **spread** - the values will be "spread" during execution. For example, if `values = [1, 2, 3, 4]`, and the execution trace is 16 steps long, the values will appear as: `[1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4]`.

### Binary registers
You can indicate that a given readonly register contains only binary values (either `1` or `0`). To do this, put a `binary` keyword after the pattern indicator. For example:
```
$k0: repeat binary [1, 0, 1, 0];
$p0: repeat binary [...];
```
Binary registers can be used as selectors in [conditional expressions](#Conditional-expressions).

## Comments
To annotate your scripts with comments, use `//`. Anything following `//` until the end of the line will not be processed by the parser. Currently, this is the only style of comments supported.

# API
This module exposes a single `parseScript()` method:

* **parseScript**(script: `string`, options?: `ScriptOptions`): `AirModule`

where:
```TypeScript
interface ScriptOptions {
    limits?             : Partial<StarkLimits>;
    wasmOptions?        : Partial<WasmOptions> | boolean;
    extensionFactor?    : number;
}
```


`StarkLimits` object can include any of the following properties:

| Property             | Description |
| -------------------- | ----------- |
| maxTraceLength       | Maximum number of steps allowed for the execution trace; the default is 2^20. |
| maxMutableRegisters  | Maximum number of mutable registers; the default is 64. |
| maxReadonlyRegisters | Maximum number of readonly registers; the default is 64. |
| maxConstraintCount   | Maximum number of transition constraints; the default is 1024. |
| maxConstraintDegree  | Maximum degree of transition constraints; the default is 16. |

`wasmOptions` object may include any of the following properties:

| Property  | Description |
| ----------| ----------- |
| memory    | A WebAssembly `Memory` object which will be passed to the underlying `FiniteField` object. |

`extensionFactor` can be used to specify factor by which the execution trace will be stretched during STARK computations. If omitted, the extension factor is assumed to be 2 * [smallest power of 2 greater than maxConstraint degree].

### AirModule
If parsing of the script is successful, the `parseScript()` method returns an `AirModule` with the following properties:

| Property             | Description |
| -------------------- | ----------- |
| name                 | Name from the STARK declaration. |
| field                | Finite field specified for the computation. |
| stateWidth           | Number of mutable registers defined for the computation. |
| publicInputCount     | Number of public input registers defined for the computation. |
| secretInputCount     | Number of secret input registers defined for the computation. |
| constraints          | An array of constraint specification objects. |
| maxConstraintDegree  | Maximum algebraic degree of transition constraints required for the computation. |
| extensionFactor      | Execution trace extension factor set for this computation. |

`AirModule` also exposes the following methods:

* **initVerification**(inputSpecs: `number[]`, publicInputs: `bigint[][]`): `VerificationObject`<br />
  Creates a `VerificationObject` for the computation. This object can be used to evaluate transition constraints at at a single point.

* **initProof**(initValues: any[], publicInputs: `bigint[][]`, secretInputs: `bigint[][]`): `ProofObject`<br />
  Creates a `ProofObject` for the computation. This object can be used to generate execution traces and evaluate transition constraints.

If parsing of the script fails, the `parseScript()` method throws an `AirScriptError` which contains a list of errors (under `.errors` property) that caused the failure.

# License
[MIT](/LICENSE) © 2019 Guild of Weavers