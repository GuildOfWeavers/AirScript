# AirAssembly

AirAssembly is a low-level language for describing Algebraic Intermediate Representation (AIR) of computations. The goal of the language is to provide a minimum number of constructs needed to fully express AIR for an arbitrary computation.

## AirAssembly module

All AirAssembly modules have the following structure:
```
(module
    <field declaration>
    <constant declarations>
    <static registers>
    <initializer>
    <transition function>
    <constraint evaluation>)
```
where, the purpose of each section is as follows:

### Field declaration
Field declaration section specifies a finite field to be used in all arithmetic expressions. Currently, only prime fields are supported. The declaration has the following form:
```
(field prime <modulus>)
```
where:
* `modulus` specifies prime field modulus.

For example:
```
(field prime 340282366920938463463374607393113505793)
```
The above example defines a prime field with modulus = 2<sup>128</sup> - 9 * 2<sup>32</sup> + 1.

### Constant declarations
Constant declaration section defines constants which can be accessed from within transition functions and constraint evaluators. Constant declaration expression has the following form:
```
(const <value>)
```
where:
* `value` can be either a scalar, a vector, or a matrix (see [value types](#Value-types) for more info).

For example:
```
(const 5)                       # declares scalar constant with value 5
(const (vector 1 2 3 4))        # declares vector constant with values [1, 2, 3, 4]
(const (matrix (1 2) (3 4)))    # declares matrix constant with rows [1, 2] and [3, 4]
```
Constants are un-named and can be referenced only by their indexes. For example, the following code block declares 3 constants with indexes 0, 1, and 2 (in the order of their declaration):
```
(const 5) (const (vector 1 2 3 4)) (const (matrix (1 2) (3 4)))
```
Once declared, value of a constant cannot be changed. To reference a constant in a transition function or a constraint evaluator `load.const` expression can be used (see [load operations](#Load-operations) for more info).

### Static registers

```
(static <registers>)
```

### Transition function
Transition function describes state transition logic needed to generate an execution trace table for a computation. Transition function expression has the following form:
```
(transition <signature> <locals> <body>)
```
Transition function components (`signature`, `locals`, `body`) are described in the following sections. The code block below shows a simple example of a transition function:
```
(transition
    (span 1) (result vector 2)      # function signature
    (local scalar)                  # local variable declaration
    (store 0                        # function body starts here
        (add                        
            (get (load.trace 0) 0)) 
            (get (load.trace 0) 1))
    (vector
        (load.local 0)
        (add
            (load.local 0)
            (get (load.trace 0) 1))))
```
The above transition function produces a trace table with 2 registers per row. The transition logic is as follows:
* At each step, the values of the first and second registers are summed.
* Then this sum becomes the value of the first register for the next row,
* And the value of the second register for the next row is set to the sum plus the value of the second register.

(this is actually a somewhat convoluted way to describe a transition function for a Fibonacci sequence).

### Transition function signature
Transition function signature contains metadata for the transition function and has the following form:
```
(span <length>) (result <type>)
```
where:
* Span `length` is the number of consecutive trace table rows which can be accessed from within the transition function body. Currently, the only supported span length is `1`. To access a trace table row `load.trace` expression can be used(see [load operations](#Load-operations) for more info).
* Result `type` is the type of the value to which the transition function resolves. This must always be a vector, and the length of the vector defines the width of the execution trace table.

For example:
```
(span 1) (result vector 2)
```
The above signature specifies that:
* The transition function can access only a single row of the trace table (the row at the current step).
* Each row of the trace table consists of 2 registers (the width of the trace table is 2).

#### Transition function locals
Locals section of a transition function declares variables which can be accessed from within the function body. Variable declaration expression has the following form::
```
(local <type>)
```
where:

* Variable `type` can either a scalar, a vector, or a matrix (see [value types](#Value-types) for more info). For non-scalar types, additional info must be supplied to specify the dimensions of the variable.

For example:
```
(local scalar)      # declares a scalar variable
(local vector 4)    # declares a vector variable with length 4
(local matrix 2 4)  # declares a matrix variable with 2 rows and 4 columns
```
Local variables are un-named and can be referenced only by their indexes. For example, the following code block declares 3 variables with indexes 0, 1, and 2 (in the order of their declaration):
```
(local scalar) (local vector 4) (local matrix 2 4)
```
To access these local variables `load.local` and `store.local` expressions can be used (see [load operations](#Load-operations) and [store operations](#Store-operations) for more info).

#### Transition function body
Transition function body consists of a list of [arithmetic expressions](#Arithmetic-expressions) such that:

1. All expressions in the list, except the last one, must be [store operations](#Store-operations) which save the result of some arithmetic expression into a local variable.
2. The last expression in the list must evaluate to a vector. The length of the vector must be equal to the length of the result vector specified in the transition function signature.

For example, the body of the function below consists of a single expression:
```
(vector (add 1 2))                      # resolves to vector [3]
```
Another example, where a local variable is used to store value of a common sub-expression:
```
(store 0 (add 1 2))                     # stores value 3 into local variable 0
(vector (load.local 0) (load.local 0))  # resolves to vector [3, 3]
```

### Constraint evaluation
Constraint evaluation section describes transition constraint evaluator logic needed to generate a constraint evaluation table for a computation. Constraint evaluation expression has the following form:
```
(evaluation <signature> <locals> <body>)
```
Constraint evaluator components (`signature`, `locals`, `body`) are similar to their equivalents in [transition function](#Transition-function), except for the following differences:

1. Constraint evaluator can access multiple rows of the execution trace table. To do this, set the `span` of the evaluator to a value greater than `1` (though, currently, `2` is the maximum allowed span value). Info about how to access future execution trace table rows can be found in [load operations](#Load-operations) section.
2. The length of the result vector defines the number of transition constraints (the width of the constraint evaluation table).

The code block below shows a simple example of a constraint evaluator which complements the example of a transition function described previously.
```
(evaluation
    (span 2) (result vector 2)         # evaluator signature
    (local scalar)                     # local variable declaration
    (store 0                           # evaluator body starts here
        (add                        
            (get (load.trace 0) 0)) 
            (get (load.trace 0) 1))
    (sub
        (load.trace 1)                 # loads the next row of execution trace
        (vector
            (load.local 0)
            (add
                (load.local 0)
                (get (load.trace 0) 1)))))
```
The evaluator above loads the next row of the execution trace table, and subtracts the result of applying the transition function to the current row from it.

## Arithmetic expressions
Arithmetic expressions are the basic building blocks for the bodies of transition functions and transition constraint evaluators. These expressions usually perform some operation with one or more values, and resolve to a new value which is the result of the operation.

### Value types
Values in AirAssembly can be of one of the following types:

1. **Scalar** - which is a single field element.
2. **Vector** - which is a one-dimensional arrays of field elements.
3. **Matrix** - which is a two-dimensional arrays of field elements.

### Vector operations
To create a vector, the following expression can be used:
```
(vector <elements>)
```
where:

*  **elements** is a list of expressions which resolve to scalars or vectors.

For example:
```
(vector 1 2 3 4)
(vector 1 (vector 2 3) (add 2 2))
```
Both of the above expressions resolve to a vector with elements `[1, 2, 3, 4]`.

#### Extracting vector element
To extract a single element from a vector, the following expression can be used:
```
(get <vector> <index>)
```
where:

 * **vector** is the vector from which the element is to be extracted,
 * **index** is the zero-based index of the element to extract.

 For example:
```
(get (vector 1 2 3 4) 1)    # resolves to scalar value 2
```

#### Slicing vectors
To extract a slice of elements from a vector, the following expression can be used:
```
(slice <vector> <start index> <end index>)
```
where:
 * **vector** is the vector from which the elements are to be extracted,
 * **start index** is the zero-based, inclusive index of the element at which to start extraction,
 * **end index** is the zero-based, inclusive index of the element at which to end extraction.

For example:
```
(slice (vector 1 2 3 4) 1 2)    # resolves to vector [2, 3]
(slice (vector 1 2 3 4) 1 1)    # resolves to vector [2]
```

### Matrix operations
To create a matrix, the following expression can be used:
```
(matrix <rows>)
```
where:
 * **rows** is a list of expressions which resolve to a list of field elements or to a vector. All rows in the matrix must have the same number of columns (elements).

 For example:
 ```
 (matrix (1 2 3 4) (5 6 7 8))
 (matrix (vector 1 2 3 4) (vector 5 6 7 8))
 ```
Both of the above expressions resolve to a matrix with 2 rows and 4 columns containing values `[[1, 2, 3, 4], [5, 6, 7, 8]]`.

### Binary operations
AirAssembly supports basic arithmetic operations. To perform such operations the following expression can be used:
```
(<operation> <operand 1> <operand 2>)
```
where:

* **operation** is one of the following operations:
  * `add` - modular addition.
  * `sub` - modular subtraction.
  * `mul` - modular multiplication.
  * `div` - modular division computed as modular multiplication of the first operand with the multiplicative inverse of the second operand.
  * `exp` - modular exponentiation, where the second operand (the exponent) must be a static scalar value.
  * `prod` - matrix or vector product as described [here](#prod-operation).
* **operand 1** is an expression resolving to the first operand.
* **operand 2** is an expression resolving to the second operand.

For example:
```
(add 1 2)   # resolves to 3
(sub 3 1)   # resolves to 2
(mul 3 3)   # resolves to 9
(div 4 2)   # resolves to 2
(exp 2 8)   # resolves to 256
```
The above operations can also take vectors and matrixes as operands. In such cases, the operations are treated as **element-wise** operations and it is required that both operands have the same lengths/dimensions. For example:
```
(add (vector 1 2) (vector 3 4))     # resolves to [4, 6]
(add (vector 1 2) (vector 3 4 5))   # results in an error
```
The second operand can also be replaced with a scalar value. For example:
```
(exp (vector 3 4) 2)                # resolves to [9, 16]
```

#### prod operation
`prod` operation can be applied only to vectors and matrixes, and types of operands define the operation performed like so:

* `(prod <matrix> <matrix>)` - performs a standard [matrix multiplication](https://en.wikipedia.org/wiki/Matrix_multiplication) of two matrixes. If the matrixes have dimensions [*n*,*p*] and [*p*,*m*] respectively, the resulting matrix will have dimensions [*n*,*m*].
* `(prod <matrix> <vector>)`- also performs matrix multiplication, but the result is a vector. If the input matrix dimensions are [*n*,*m*], and the length of the input vector is *m*, the resulting vector will have length *n*.
* `(prod <vector> <vector>)` - performs a [linear combination](https://en.wikipedia.org/wiki/Linear_combination) of two vectors. Vectors must have the same length, and the output is a scalar.

### Unary operations
AirAssembly also supports two unary arithmetic operations. These operations are applied to a single operand like so:
```
(<operation> <operand>)
```
where:

* **operation** is one of the following operations:
  * `neg` - modular additive inverse.
  * `inv` - modular multiplicative inverse.
* **operand** is an expression resolving a scalar, a vector, or a matrix.

For example (assuming field modulus is 23):
```
(neg 21)    # resolves to 2
(inv 15)    # resolves to 20
```
If the operand is a vector or a matrix, the operation is performed **element-wise**. For example:

```
(neg (vector 1 2 3 4))      # resolves to [22, 21, 20 19]
```

### Load operations
To retrieve values from various sections of a program's memory, the following expression can be used:
```
(load.<source> <index>)
```
where:

* **source** specifies the memory segment; can be one of the following values:
  * `const` - array of global constants.
  * `static` - static register table.
  * `trace` - execution trace table.
  * `local` - array of local variables.
* **index** specifies which value to retrieve from the specified source. The meaning of this parameter depends on the `source` parameter as follows:
  * `const` - index of a global constant.
  * `static` - row offset into the static register table, with 0 being the row at the current step, 1 being the row at the next step etc.
  * `trace` - row offset into the execution trace table, with 0 being the row at the current step, 1 being the row at the next step etc.
  * `local` - index of a local variable.

For example:
```
(load.const 0)   # resolves to the value of the global constant at index 0
(load.static 0)  # resolves to the static register row at the current step
(load.trace 0)   # resolves to the execution trace row at the current step
(load.trace 1)   # resolves to the execution trace row at the next step
(load.local 0)   # resolves to the value of local variable at index 0
```

For `static` and `trace` sources, the result of a load operation is always a vector with each element of the vector corresponding to a single register. For `const` and `local` sources, the result could be a scalar, a vector, or a matrix - depending on the declared type of a global constant or a local variable.

**Note:** trying to load a value from a local variable that hasn't been initialized yet, will result in an error.

### Store operations

To update a value of a local variable, the following expression can be used:
```
(store.local <index> <value>)
```
* **index** is a zero-based position of the variable in the local variables array;
* **value** is an expression which resolves to a value to be assigned to the local variable. Type of the value must match the declared type of the local variable, otherwise an error will be thrown.

For example:
```
(store.local 0 1)                   # stores a scalar into local variable 0
(store.local 1 (vector 1 2 3 4))    # stores a vector into local variable 1
(store.local 1 5)                   # results in an error
```

Value of a given local variable can be updated an unlimited number of times. Also, the `value` expression can contain references to the variable being updated. For example, the following is perfectly valid:
```
(store.local 0 1)                       # stores 1 into local variable 0
(store.local 0 (add 2 (load.local 0)))  # stores 3 into local variable 0
```
**Note:** unlike other expressions, store expressions do not resolve to a value, and therefore, cannot be used as sub-expressions in other expressions.
