# Release History

### v0.5 - XXX

* Added support for unary operators (additive and multiplicative inverses)
* [breaking] Changed assignment operator from `:` to `<-`
* Added support for vector slicing and element extraction
* Added support for inline vector definitions
* Allowed direct references to register banks
* Enabled invoking transition function from transition constraints
* [breaking] Added `for steps` loops
* [breaking] Added `for each` loops
* [breaking] Changed syntax for ternary expression

### v0.4.2 - September 5, 2019

* Enabled nested `when` statements

### v0.4.1 - August 29, 2019

* Bugfix in composition domain generation

### v0.4.0 - August 24, 2019

* [breaking] Major refactoring of proof and verification contexts

### v0.3.3 - August 14, 2019

* Minor updates to `ScriptOptions` interface

### v0.3.2 - August 14, 2019

* Refactored `parseScript()` function to take `wasmOptions` config

### v0.3.1 - August 6, 2019

* Updated galois dependency to v0.4

### v0.3 - July 19, 2019

* Updated interfaces to work with vectors instead of bigint arrays

### v0.2.3 - July 17, 2019

* Fixed a bug in repeat readonly registers

### v0.2.2 - July 17, 2019

* Added `sEvaluations` to `ProofContext`

### v0.2.1 - July 11, 2019

* Minor interface changes in AirObject

### v0.2 - July 10, 2019

* Added support for vector composition
* Added support for binary registers
* Added support for conditional expressions
* Added support for public and secret input registers
* Implemented constraint degree inference

### v0.1 - June 17, 2019

* Initial release with support for basic arithmetic statement blocks.