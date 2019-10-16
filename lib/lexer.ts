// IMPORTS
// ================================================================================================
import { createToken, Lexer } from "chevrotain";
import { lexerErrorMessageProvider } from "./errors";

// LITERALS, REGISTERS, and IDENTIFIERS
// ================================================================================================
export const IntegerLiteral     = createToken({ name: "IntegerLiteral",   pattern: /0|[1-9]\d*/    })
export const Identifier         = createToken({ name: "Identifier",       pattern: /[a-zA-Z]\w*/   });

export const RegisterRef        = createToken({ name: "RegisterRef",      pattern: Lexer.NA });
export const MutableRegister    = createToken({ name: "MutableRegister",  pattern: /\$[rn]\d{1,2}/,  categories: RegisterRef });
export const ReadonlyRegister   = createToken({ name: "ReadonlyRegister", pattern: /\$[kps]\d{1,2}/, categories: RegisterRef });
export const InitRegister       = createToken({ name: "InitRegister",     pattern: /\$\i\d{1,2}/,    categories: RegisterRef });
export const RegisterBank       = createToken({ name: "RegisterBank",     pattern: /\$[rnkps]/ });

// KEYWORDS
// ================================================================================================
export const Define      = createToken({ name: "Define",      pattern: /define/,        longer_alt: Identifier });
export const Over        = createToken({ name: "Over",        pattern: /over/,          longer_alt: Identifier });
export const Prime       = createToken({ name: "Prime",       pattern: /prime/,         longer_alt: Identifier });
export const Binary      = createToken({ name: "Binary",      pattern: /binary/,        longer_alt: Identifier });
export const Field       = createToken({ name: "Field",       pattern: /field/,         longer_alt: Identifier });

export const Transition  = createToken({ name: "Transition",  pattern: /transition/,    longer_alt: Identifier });
export const Registers   = createToken({ name: "Registers",   pattern: /registers?/,    longer_alt: Identifier });

export const Enforce     = createToken({ name: "Enforce",     pattern: /enforce/,       longer_alt: Identifier });
export const Constraints = createToken({ name: "Constraints", pattern: /constraints?/,  longer_alt: Identifier });

export const For         = createToken({ name: "For",         pattern: /for/,           longer_alt: Identifier });
export const Each        = createToken({ name: "Each",        pattern: /each/,          longer_alt: Identifier });
export const Init        = createToken({ name: "Init",        pattern: /init/,          longer_alt: Identifier });
export const Steps       = createToken({ name: "Steps",       pattern: /steps?/,        longer_alt: Identifier });
export const Do          = createToken({ name: "Do",          pattern: /do/,            longer_alt: Identifier });
export const With        = createToken({ name: "With",        pattern: /with/,          longer_alt: Identifier });
export const Nothing     = createToken({ name: "Nothing",     pattern: /nothing/,       longer_alt: Identifier });
export const When        = createToken({ name: "When",        pattern: /when/,          longer_alt: Identifier });
export const Else        = createToken({ name: "Else",        pattern: /else/,          longer_alt: Identifier });
export const All         = createToken({ name: "All",         pattern: /all/,           longer_alt: Identifier });

export const Using       = createToken({ name: "Using",       pattern: /using/,         longer_alt: Identifier });
export const Readonly    = createToken({ name: "Readonly",    pattern: /readonly/,      longer_alt: Identifier });
export const Repeat      = createToken({ name: "Repeat",      pattern: /repeat/,        longer_alt: Identifier });
export const Spread      = createToken({ name: "Spread",      pattern: /spread/,        longer_alt: Identifier });

export const Import      = createToken({ name: "Import",      pattern: /import/,        longer_alt: Identifier });
export const From        = createToken({ name: "From",        pattern: /from/,          longer_alt: Identifier });
export const As          = createToken({ name: "As",          pattern: /as/,            longer_alt: Identifier });

// OPERATORS
// ================================================================================================
export const AddOp      = createToken({ name: "AddOp",      pattern: Lexer.NA });
export const Plus       = createToken({ name: "Plus",       pattern: /\+/,  categories: AddOp });
export const Minus      = createToken({ name: "Minus",      pattern: /-/,   categories: AddOp });

export const MulOp      = createToken({ name: "MulOp",      pattern: Lexer.NA });
export const Star       = createToken({ name: "Star",       pattern: /\*/,  categories: MulOp });
export const Slash      = createToken({ name: "Slash",      pattern: /\//,  categories: MulOp });
export const Pound      = createToken({ name: "Pound",      pattern: /#/,   categories: MulOp });

export const ExpOp      = createToken({ name: "ExpOp",      pattern: /\^/ });

export const Equals     = createToken({ name: "Equals",     pattern: /=/ });
export const AssignOp   = createToken({ name: "AssignOp",   pattern: /<-/ });
export const ResolveOp  = createToken({ name: "ResolveOp",  pattern: /->/ });

// SYMBOLS
// ================================================================================================
export const LCurly     = createToken({ name: "LCurly",     pattern: /{/        });
export const RCurly     = createToken({ name: "RCurly",     pattern: /}/        });
export const LSquare    = createToken({ name: "LSquare",    pattern: /\[/       });
export const RSquare    = createToken({ name: "RSquare",    pattern: /]/        });
export const LParen     = createToken({ name: "LParen",     pattern: /\(/       });
export const RParen     = createToken({ name: "RParen",     pattern: /\)/       });
export const Comma      = createToken({ name: "Comma",      pattern: /,/        });
export const Colon      = createToken({ name: "Colon",      pattern: /:/        });
export const Semicolon  = createToken({ name: "Semicolon",  pattern: /;/        });
export const Ellipsis   = createToken({ name: 'Ellipsis',   pattern: /\.\.\./   });
export const Pipe       = createToken({ name: 'Pipe',       pattern: /\|/       });
export const Tilde      = createToken({ name: 'Tilde',      pattern: /~/        });
export const Ampersand  = createToken({ name: 'Ampersand',  pattern: /&/        });
export const QMark      = createToken({ name: 'QMark',      pattern: /\?/       });
export const EMark      = createToken({ name: 'EMark',      pattern: /!/        });

export const DoubleDot  = createToken({ name: 'DoubleDot',  pattern: /\.\./     });

// WHITESPACE AND COMMENTS
// ================================================================================================
export const WhiteSpace = createToken({
    name    : "WhiteSpace",
    pattern : /[ \t\n\r]+/,
    group   : Lexer.SKIPPED
});

export const Comment = createToken({
    name    : "Comment",
    pattern : /\/\/.+/,
    group   : "comments"
});

// ALL TOKENS
// ================================================================================================
export const allTokens = [
    WhiteSpace, Comment,
    
    Define, Over, Prime, Binary, Field, Transition, Registers, Steps, Enforce, Constraints, For, Each,
    Do, With, Nothing, When, Else, Repeat, Spread, Using, Readonly, Import, From, As, All, Init,

    AssignOp, ResolveOp, Equals, Plus, Minus, Star, Slash, Pound, ExpOp, MulOp, AddOp,

    LCurly, RCurly, LSquare, RSquare, LParen, RParen, Comma, Colon, Semicolon, Ellipsis, DoubleDot,
    Pipe, Tilde, Ampersand, QMark, EMark,

    Identifier,

    MutableRegister, ReadonlyRegister, InitRegister, RegisterRef, RegisterBank,

    IntegerLiteral
];

// EXPORT LEXER INSTANCE
// ================================================================================================
export const lexer = new Lexer(allTokens, { errorMessageProvider: lexerErrorMessageProvider });