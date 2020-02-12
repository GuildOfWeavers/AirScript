// IMPORTS
// ================================================================================================
import { Context, ExecutionContext } from './Context';
import { LoopContext } from './LoopContext';
import { LoopBlockContext } from './LoopBlockContext';
import { LoopBaseContext } from './LoopBaseContext';
import { ExprBlockContext } from './ExprBlockContext';

// RE-EXPORTS
// ================================================================================================
export { Context, ExecutionContext } from './Context';
export { LoopContext } from './LoopContext';
export { LoopBlockContext } from './LoopBlockContext';
export { LoopBaseContext } from './LoopBaseContext';
export { ExprBlockContext } from './ExprBlockContext';
export { RootContext } from './RootContext';

// PUBLIC FUNCTIONS
// ================================================================================================
export function createExecutionContext(type: string, parent: Context): ExecutionContext {
    if (type === 'loop') {
        return new LoopContext(parent);
    }
    else if (type === 'loopBlock') {
        return new LoopBlockContext(parent);
    }
    else if (type === 'loopBase') {
        return new LoopBaseContext(parent);
    }
    else {
        return new ExprBlockContext(parent);
    }
}

export function closeExecutionContext(context: ExecutionContext): void {
    
    const parent = context.parent;

    if (context instanceof LoopBaseContext || context instanceof LoopBlockContext) {
        (parent as LoopContext).addBlock(context.result);
    }
    else if (context instanceof LoopContext && parent !== undefined) {
        (parent as LoopBlockContext).setLoopResult(context.result);
    }
}