# AirScript
This library contains grammar rules and provides a simple parser for AirScript - a language for defining Algebraic Intermediate Representation (AIR) of computations. AIR is used in [zk-STARKs](https://eprint.iacr.org/2018/046) to define transition functions and constraints.

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

    // constant used in transition function and constraint computations
    const alpha: 3;
    
    // a repeating set of value accessible in transition function and constraints
    static roundConstant: cycle [
        42, 43, 170, 2209, 16426, 78087, 279978, 823517, 2097194, 4782931,
        10000042, 19487209, 35831850, 62748495, 105413546, 170859333
    ];

    // the computation requires a single input
    secret input startValue: element[1];

    // transition function definition
    transition 1 register {
        for each (startValue) {
            init { yield startValue; }

            for steps [1..255] {
                yield $r0^3 + roundConstant;
            }
        }
    }

    // transition constraint definition
    enforce 1 constraint {
        for all steps {
            enforce transition($r) = $n;
        }
    }
}
```

## STARK declaration
Every STARK definition in AirScript starts with a declaration:
```
define <name> over <field> { ... }
```
where:

* **name** specifies the name of the STARK. The name can contain letters, numbers, and underscores, and must start with a letter.
* **field** defines a finite field for all mathematical operations in the computation. Currently, only prime fields are supported. A field can be defined like so:
  * Prime field : `prime field (modulus)`

The body of a STARK is placed between curly braces following the declaration. The elements of the body are described below.

## Constants
Constants are used to bind constant values to names. Once a constant is defined, you can reference it by name in transition functions and constraints.

Values of constants can be of 3 types: ***scalars***, ***vectors***, and ***matrixes***. Here are a few examples:
```
const s: 123;                     // scalar constant
const v: [1, 2, 3];               // vector with 3 elements
const m: [[1, 2, 3], [4, 5, 6]];  // 2x3 matrix
```
Names of constants can contain letters, numbers, and underscores and must start with a letter.

## Static variables
Static variables are used to define values that repeat in a cyclic pattern. These variables can be referenced by name in transition functions and constraints.

Here are a few examples of static variable declarations:
```
static foo: cycle [1, 2, 3, 4];
static bar: [
    cycle [1, 2, 3, 4],
    cycle [5, 6, 7, 8]
];
```
In the above example, referencing to `foo` will resolve to a scalar value. This value will be `1` at step 0 of the computation, `2` at step 1, `3` at step 2, `4` at step 3, and then again `1` at step 4 (value repeat in a cycle).

On the other hand, references to `bar` will resolve to a vector of 2 values. This vector will be `[1, 5]` at step 0, `[2, 6]` at step 1 etc.

Names of static variables can contain letters, numbers, and underscores and must start with a letter.

### Pseudorandom cycles
In many situations it may be desirable to have a static sequence of values generated pseudorandomly. It is of course possible to generate the values beforehand, and then to embed them into the script as static variables - but, for a long sequence of values, this is not very compact. To aid with this, AirScript allows specifying pseudorandom sequences like so:

```
static <name>: cycle prng(<method>, <seed>, <length>);
```
where:
* `name` is the name of the static variable.
* `method` is the method of generating a pseudorandom sequence. Currently, the only supported method is `sha256`.
* `seed` is a hexadecimal representation of the seed from which the sequence is derived.
* `length` is the number of values in the sequence. This must be a power of 2.

For example:
```
static foo: cycle prng(sha256, 0x01, 64);
```
The above statement will generate a sequence of 64 values using `sha256` method and value `1` as the seed.

## Inputs
Input variables define the number and type of inputs required by the computation. An input declaration has the following form:
```
<scope> input <name>: <type>[<width>][<rank>]?;
```
where:
  * `scope` can be either `public` or `secret`. Public inputs must be known to both, the prover and the verifier; `secret` inputs are assumed to be known only to the prover.
  * `name` is the name which can be used to reference the input in transition functions and constraints. Input names can contain letters, numbers, and underscores and must start with a letter.
  * `type` can be either `element` or `boolean`. Boolean inputs are restricted to values of `0` and `1`, while element inputs can contain values representing full field elements.
  * `width` specifies the number of elements covered by the input. For example, if the width is set to `1`, the input will resolve to scalar values. If, however, the width is set to `2`, the input will resolve to a vector of 2 elements. Setting input width to `0` is not allowed and will result in an error.
  * `rank` specifies the rank of the input in the input hierarchy (see [input loops](#Input-loops) for more info). If the `rank` is omitted, it is assumed to be `0`.

Here are a few examples of input declarations:
```
public input foo: element[1];
secret input bar: boolean[1][1];
secret input baz: element[2][1];
```
In the above example, references to `foo` will resolve to a scalar value; references to `bar` will resolve to a scalar value which will be either `0` or `1`; and references to `baz` will resolve to a vector of 2 values. Moreover, for each value of `foo`, the computation expects one or more values of `bar` and `baz` to be provided.

## Transition function
A core component of a STARK's definition is a state transition function. A transition function can be defined like so:
```
transition <number of registers> registers { ... }
```
where:

* **number of registers** specifies the number of trace registers which hold values of the computation's execution trace.

The body of a transition function is defined by an [input loop](#Input-loops) which, given the current state, evaluates to the next state of the computation. For example:
```
transition 1 register {
    for each (foo) {
        init { yield foo; };

        for steps [1..31] {
            yield $r0 + 1;
        }
    }
}
```
This transition function works with a single trace register (`$r0`) and does the following:

1. Initializes the value of `$r0` to be the value passed in via [input](#Inputs) `foo`.
2. For 31 steps, computes the next value of `$r0` as: the current value of `$r0` plus 1.

If your computation involves more than 1 trace register, your transition function should return a vector with values for the next state for all registers. Here is an example:
```
transition 2 registers {
    for each (foo) {
        init { yield [foo, foo]; };

        for steps [1..31] {
            a0 <- $r0 + $r1;
            a1 <- a0 + $r1;
            yield [a0, a1];
        }
    }
```
The above example describes a state transition function that operates over 2 registers (`$r0` and `$r1`):

* Both registers are initialized to the same value (passed in via input variable `foo`).
* The next value of register `$r0` is set to the sum of the current values of both registers;
* The next value of register `$r1` is set to the same sum plus current value of register `$r1` again.

(this is actually a somewhat convoluted way to describe a transition function for a Fibonacci sequence).

In general, the length of the vector to which the transition function resolves must be equal to the number of trace registers specified in the declaration of the transition function.

## Transition constraints
Another core component of a STARK's definition is a set of transition constraints. A computation is considered valid only if transition constraints are satisfied for all steps (except the last one). Transition constraints can be defined like so:
```
enforce <number of constraints> constraints { ... }
```
where:

* **number of constraints** specifies the number of constraints needed to describe the computation.

Similarly to transition functions, the body of transition constraints is defined by an [input loop](#Input-loops). But, there are a few differences.

First, unlike transition functions, transition constraints can reference future states of trace registers. For example:
```
enforce 1 constraint {
    for each (foo) {
        init { 
            enforce $n0 = foo;
        }

        for steps [1..31] {
            enforce $n0 = $r0 + 1;
        }
    }
```
where `$n0` contains value of register `$r0` at the next step of the computation.

Second, instead of yielding values for the next state of the computation, transition constraints enforce equality between two values by using `enforce` statement as shown in the example above.

Thirds, if your constraints don't do anything fancy and just compare current and next state of the execution trace, you can write them simply like this:
```
enforce 1 constraint {
    for all steps {
        enforce transition($r) = $n;
    }
}
```
This wil evaluate as:

1. First apply the transition function to the current state;
2. Then enforce equality between the resulting value and the next state of the computation (`$n`).

### Constraint degree
One of the key components of proof complexity is the arithmetic degree of transition constraints. AirScript automatically infers the degree of each constraint based on the arithmetic operations performed. But it is important to keep this degree in mind lest it becomes too large. Here are a few pointers:

* All trace registers, static variables, and inputs have a degree of `1`.
* Raising an expression to a power increases the degree of the expression by that power. For example, the degree of `$r0^3` is `3`.
* Multiplying an expression by a register raises the degree of the expression by `1`. For example, the degree of `($r0 + 2) * $r0` is `2`.
* Using [conditional expressions](#Conditional-expressions) increases the degree of the expression by `1`.
* [Input loops](#Input-loops) increase degree of an expression by `n`, where `n` is the depth of the loop.

## Loops
Loop constructs in AirScript are somewhat different from loops in regular programming languages. For example, loops in AirScript always resolve to a single value for a single iteration (this value could be a number or a vector of numbers). In a way, loops allow you to define blocks of [arithmetic statements](#arithmetic-statements) which should be evaluated at specific steps. Currently, AirScript support two types of loops:

1. `for each` loops or [input loops](#Input-loops) which iterate over sets of inputs.
2. `for steps` loops or [segment loops](#Segment-loops) which iterate over segments of execution trace.

### Input loops
Transition functions and transition constraints contain a single top-level input loop. This loop specifies how the inputs are to be used to initialize the execution trace. You can define an input loop like so:
```
for each (<list of inputs>) { ... }
```
where:

* **list of inputs** is a comma-separated list of [inputs](#Inputs).

A body of an input loop must have an `init` clause, which should be followed by one or more [segment loops](#Segment-loops) (input loops can also be [nested](#Nested-input-loops)). Here is an example:
```
for each (foo) {
    init { yield [foo, foo * 2]; }

    for steps [1..31] { yield $r^2; }
    for steps [32..63] { yield $r^3; }
}
```
Here is what's happening here:

* The loop expects a single input `foo`;
* The execution trace has 2 registers. The first register is initialized to the value of `foo`, and the second one is initialized to `2*foo`;
* Then, for 31 steps, state transition is defined as squaring of the values in each of the registers.
* Then, for 32 more steps, state transition is defined as cubing of values in each of the registers.

A couple of things to note:

* Input `foo` can be referenced only within the `init` clause. Referencing it anywhere else will result in an error.
* The `init` clause must terminate with a `yield` expression for transition functions, and with `enforce` expression for transition constraints.

#### Nested input loops
Input loops can be nested to a significant depth (though, the greeter is the depth, the higher is the arithmetic degree of transition function/constraints). Here is an example of how this would look like:
```
for each (foo, bar) {
    init { ... }

    for each (bar) {
        init { ... }

        for steps [1..31] { ... }
        for steps [32..63] { ... }
    }
}
```
In this example, two inputs are expected such that for every value of `foo`, one or many values of `bar` are expected (you can say that a relationship between them is "one-to-many"). Here is how valid inputs for this loop structure could look like:
```
[
    [1, 2],             // values for foo
    [[3, 4], [5, 6]]    // values for bar
]
```
To understand how these inputs are consumed by the code, imagine a tape with two columns that looks like so:

| foo | bar |
| :-: | :-: |
| 1   | 3   |
|     | 4   |
| 2   | 5   |
|     | 6   |

This tape is consumed one row at a time. Whenever values for both `foo` and `bar` are present, the `init` clause of the out loop is executed. But when only value for `bar` is available, the `init` clause of the inner loop is executed instead. In either case, after an `init` clause is executed, the segment loops are executed for the specified number of steps (in this case for 63 steps total). So, the execution will unroll like so:

1. `init` clause of the outer loop is evaluated with `$foo=1, bar=3`.
2. Segment loops are evaluated for a total of 63 steps.
3. `init` clause of the inner loop is evaluated with `bar=4`.
4. Segment loops are evaluated for a total of 63 steps.
5. `init` clause of the outer loop is evaluated with `foo=2, bar=5`.
6. Segment loops are evaluated for a total of 63 steps.
7. `init` clause of the inner loop is evaluated with `bar=6`.
8. Segment loops are evaluated for a total of 63 steps.

In the end, the execution trace for the above set of inputs will be 256 steps long.

One thing to note: when defining inner loops, the set of inputs must always narrow. An input's rank is increased with each additional loop level.

For example, if you have loops nested 3 levels deep, the top level loop may operate with inputs `(foo, bar, baz)`. The loop next level down must narrow this, for example, to `(bar, baz)`. And the inner-most loop must down it further to just `(baz)`. In this example, rank of `foo` would be `0`, rank of `bar` would be `1`, and rank of `baz` would be `2`.

### Parallel input loops
It is possible to have several input loops running in parallel. This is accomplished by defining register "subdomains" using `with` like so:
```
for each (foo, bar, baz) {

    with $r[0..1] {
        init { ... }

        for each (bar) {
            init { ... }

            for steps [1..31] { ... }
            for steps [32..63] { ... }
        }
    }

    with $r[2..3] {
        init { ... }

        for each (baz) {
            init { ... }

            for steps [1..31] { ... }
            for steps [32..127] { ... }
        }
    }
}
```
In the above example, we split our execution trace into two trace domains each consisting of 2 registers. This essentially creates two separate execution traces running in parallel: the first execution trace consists of registers `$r0` and `$r1`, while the second trace consists of registers `$r2` and `$r3`.

We then defined two separate loop structures for each of the traces. These structures don't need to be the same. In the example above, the loop operating over input `bar` defines 64 steps per input, but the loop operating over input `baz` defines 128 steps per input. This can be taken further and each of the defined domains can have different levels of nesting and can be further subdivided into smaller subdomains.

**Note**: even though trace subdomains can have different looping structures, all subdomains must resolve to execution traces of the same length. So, for the above example, it is expected that there will be twice as many `bar` inputs as there will be `baz` inputs because `baz` inputs require twice as many steps. Here is how a potential set of inputs for this example might look like:

```
[
    [1, 2],                         // values for foo
    [[3, 4, 5, 6], [7, 8, 9, 10]],  // values for bar
    [[11, 12], [13, 14]]            // values for baz
]
```

### Segment loops
Segment loops can be used to specify different state transition logic for different segments (groups of steps) of a computation. Here is how you can define a segment loop:
```
for steps <list of intervals> { ... }
```
where:
* **list of intervals** is a comma-separated list of step intervals. Each interval is specified by defining start and end points of the interval (both inclusive).

Body of each of the segments must terminate with a `yield` statement for transition functions, and with `enforce` statement for transition constraints as shown in the example below:
```
for steps [1..4, 60..62] { yield $r0^2; }
for steps [5..59, 63] { yield $r0^3; }
```
In this example, the transition logic is defined as follows:

* For steps 1 through 4 and 60 - 62 (7 steps total), the next value of `$r0` is defined as a square of its current value.
* For steps 5 through 59 and step 63 (56 steps total), the next value of `$r0` is defined as a cube of its current value.

A few things to keep in mind when defining intervals:

* A set of segment loops must fully define the entire execution trace. This means that you can't have "gap" steps for which transition logic is undefined (e.g. defining transition logic just for intervals [1..3] and [5..7] is invalid because step 4 is missing).
* You also can't have "overlapping" intervals. This means that each step must map unambiguously to state transition logic (e.g. defining transition logic for intervals [1..5] and [5..7] is invalid because transition logic for step 5 is ambiguous).
* One of the intervals must start with step `1`. This is because `init` clause of a parent input loop is executed at step `0`.
* Length of the execution trace defined by all intervals must be a power of 2. For example, [1..63] is valid because this implies 64 steps (including step `0`), but [1..62] is not.

## Component imports
Component imports can be used to import computations defined in external [AirAssembly](https://github.com/GuildOfWeavers/AirAssembly) modules. This enables composing AirScripts from smaller modules and makes the task of defining complex scripts much easier. An `import` statement has the following form:
```
import {<imported members>} from <file path>;
```
where:
* `imported members` is a comma-separated list of components to be imported from an AirAssembly module. Each member can also be given an alias.
* `file path` is the path (relative or absolute) to the AirAssembly file containing the components.

For example:
```
import { Poseidon as Hash } from './stdlib256.aa';
```
This will import `Poseidon` component from an AirAssembly file `stdlib256.aa` located in the same directory as the importing AirScript. The imported component is given an alias `Hash` by which it can be referred to within the body of the script.

### Invoking imported components
Invoking imported components requires defining a [trace subdomain](#Parallel-input-loops) over which the components will operate and providing inputs for the component. This can be done by using a `with` statement like so:
```
with <subdomain> <yield | enforce> <component>(<inputs>);
```
where:
* `subdomain` is the trace subdomain over which the component operates.
* `component` is the name (or alias) of the imported component.
* `yield` or `enforce` are the keywords which depend on the context. Within a transition function a `yield` keyword must be used, but within a constraint evaluator an `enforce` keyword must be used.
* `inputs` is a comma-separated expressions which define inputs for each of the input registers required by the component.

For example:
```
with $r[0..2] yield Hash(a, b);
```
In this example, we've defined our trace domain as the first 3 registers of the execution trace. This is because the imported `Poseidon` hash function requires 3 trace registers to operate. Then we've provided two values (`a` and `b`) as inputs, again, because `Poseidon` hash function expects 2 inputs.

Here is a more sophisticated example of a transition function using imported `Poseidon` hash function (aliased as `Hash`) to define a computation for a Merkle branch verification:
```
transition 6 registers {
    for each (leaf, node, indexBit) {

        init {
            s1 <- [leaf, node, 0];
            s2 <- [node, leaf, 0];
            yield [...s1, ...s2];
        }

        for each (node, indexBit) {
            h <- indexBit ? $r3 : $r0;
            with $r[0..2] yield Hash(h, node);
            with $r[3..5] yield Hash(node, h);
        }
    }
}
```

## Arithmetic statements
Bodies of loops are nothing more than a series of arithmetic statements (separated by semicolons) which evaluate to a number or to a vector of numbers. Here is an example:

```
a0 <- $r0 + $r1;
a1 <- $r0 * a0;
[a0, a1];
```
Here is what this means:

* Define variable `a0` to be the sum of values from trace registers `$r0` and `$r1`.
* Define variable `a1` to be the product of value trace register `$r0` and variable `a0`.
* Set the return value of the statement block to a vector of two elements with values of `a0` and `a1` being first and second elements respectively.

Every arithmetic statement is an *assignment* statement. The assignment operator (`<-`) assigns a value of an expression (the right side) to a variable (the left side). Every block of statements must terminate with expression which defines the return value of the entire block.

Within the statements you can reference registers, constants, variables, and perform arithmetic operations with them. All of this is described below.

### Registers
A computation's execution trace consists of a series of state transitions. A state of a computation at a given step is held in an array of registers. These registers are available in transition functions and constraints via implicit variables:

* **$r** variable holds values of trace registers for the *current step* of the computation. This variable is accessible in transition functions and transition constraints.
* **$n** variable holds values of trace registers for the *next step* of the computation. This variable is accessible only in transition constraints.

Both `$r` and `$n` variables are vectors. So, to reference a specific register, you can use an [extraction expression](#Vector-element-extraction) like so: `$r[0]`. This will resolve to the value of the first register at the current step. You can also use a shorthand notation like so: `$r0` - this will resolve to the same value as `$r[0]`.

**Note:** variables `$r` and `$n` are *read-only* and trying to assign values to them will result in an error.

### Variables
To simplify your scripts you can aggregate common computations into variables. Once a variable is defined, it can be used in all subsequent statements. You can also change the value of a variable by re-assigning to it. For example, something like this is perfectly valid:
```
a0 <- $r0 + 1;
a0 <- a0 + $r1;
a0;
```
A name of a variable can include letters, numbers, and underscores (and must start with a letter). Variable can be of 3 different types: ***scalars***, ***vectors***, and ***matrixes***.

#### Scalars
A variable that represents a single field element is a scalar. Implicitly, all registers hold scalar values. All constant literals are also scalars. Here are a few examples:
```
a0 <- 1;
foo <- $r0;
foo_bar <- $r0 + 1;
```

#### Vectors
Scalars can be aggregated into vectors (a vector is just a 1-dimensional array). You can define a vector by putting a comma-separated list of scalars between square brackets. Register banks `$r` and `$n` are also vectors. Here are a few examples:
```
v0 <- [1, 2];
foo <- [$r0, $r1];
foo_bar <- [$r0, $r1 + 1];
```

##### Vector composition
You can combine multiple vectors into a single vector using destructuring syntax like so:
```
v0 <- [1, 2];
v1 <- [3, 4];
v3 <- [...v0, ...v1, 5]; // will contain [1, 2, 3, 4, 5]
```

##### Vector element extraction
You can extract a subset of elements from a vector like so:
```
a <- [1, 2, 3, 4];
b <- a[1];      // b is equal to 2
c <- b[2..3];   // C is equal to [3, 4]
```
#### Matrixes
A matrix is a 2-dimensional array of scalars. You can define a matrix by listing its elements in a row-major form. Here are a couple of examples:
```
m0 <- [[1, 2], [1, 2]];
foo <- [[$r0, $r1, 1], [$r1 + $r2, 42, $r3 * 8]];
```

### Operations
To do something useful with registers, variables etc. you can apply arithmetic operations to them. These operations are `+`, `-`, `*`, `/`, `^`.

When you work with scalar values, these operations behave as you've been taught in the elementary school (though, the math takes place in a finite field). But you can also apply these operations to vectors and matrixes. In such cases, these are treated as **element-wise** operations. Here are a few examples:
```
v0 <- [1, 2];
v1 <- [3, 4];
v2 <- v0 + v1;    // v2 is [4, 6]
v2 <- v1^2;       // v2 is [9, 16]
```
You can also replace the second operand with a scalar. Here is how it'll work:
```
v0 <- [1, 2];
v1 <- V0 * 2;     // v2 is [2, 4]
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
a <- [1, 2];
b <- (-a);  // is equivalent to computing [0 - 1, 0 - 2]
c <- (/a);  // is equivalent to computing [1/1, 1/2]
```

### Conditional expressions
Sometimes you may want to set a value of a variable (or variables) predicated on some condition. To do this, you can use conditional expressions. AirScript supports two types of conditional expressions **ternary expression** and **when...else** statement.

#### Ternary expression
Using ternary expression you can set a value of a variable to one of two options where each option is a single expression. The syntax for the expression is:
```
<variable> <- <selector> ? <expression 1> : <expression 2>;
```
For example:
```
v <- foo ? ($r0 + bar) : $r1;
```
The above is just syntactic sugar for writing something like this:
```
v <- ($r0 + bar) * foo + $r1 * (1 - foo);
```
The only restriction imposed by the ternary expression is that `selector` must be a boolean value.

#### When...else statement
`when...else` statements are similar to ternary expressions but now your options can be entire blocks of arithmetic expressions. The syntax for the statement is:
```
when (<selector>) {<block 1>} else {<block 2>}
```
For example:
```
A <- when (foo) {
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
Both blocks must resolve to a vector of the same length. Also, similarly to ternary expressions, the `selector` must be a boolean value.

In the above, `when...else` statement is equivalent to multiplying the result of evaluating `when` block by `$foo`, multiplying the result of `else` block by `1 - foo`, and then performing an element-wise sum of resulting vectors.

You can also nest `when...else` to create more sophisticated selection conditions. For example:
```
A <- when (foo) {
    when (bar) {
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

## Comments
To annotate your scripts with comments, use `//`. Anything following `//` until the end of the line will not be processed by the parser. Currently, this is the only style of comments supported.

# API
This module exposes a single `compile()` function which has the following signature:

* **parseScript**(source: `string` | `Buffer`, componentName?: `string`): `AirSchema`

This function parses and compiles provided AirScript code into an [AirSchema](https://github.com/GuildOfWeavers/AirAssembly#air-schema) object. If `source` parameter is a `Buffer`, it is expected to contain AirScript code. If `source` is a string, it is expected to be a path to a file containing AirScript code. If `componentName` parameter is provided, it will be used as the name for the component within `AirSchema` object. Otherwise, the name will be set to `default`.

If parsing of the script fails, the `parseScript()` method throws an `AirScriptError` which contains a list of errors (under `.errors` property) that caused the failure.

# License
[MIT](/LICENSE) © 2019 Guild of Weavers
