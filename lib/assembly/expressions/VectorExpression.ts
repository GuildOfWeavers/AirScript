// IMPORTS
// ================================================================================================
import { Expression, AssemblyOptions } from "./Expression";
import { ExtractExpression } from "./ExtractExpression";
import { SliceExpression } from "./SliceExpression";

// CLASS DEFINITION
// ================================================================================================
export class VectorExpression extends Expression {

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(elements: Expression[]) {
        
        let degree: bigint[] = [];
        for (let element of elements) {
            if (element.isScalar) {
                degree.push(element.degree as bigint);
            }
            else if (element.isVector) {
                degree = degree.concat(element.degree as bigint[]);
            }
            else {
                throw new Error('cannot build vector from matrix elements');
            }
        }

        super([degree.length, 0], degree, elements);
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get elements(): Expression[] { return this.children; }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    compress() {
        let groupId = '', group: (ExtractExpression | SliceExpression)[] = [];

        for (let element of this.elements) {
            if (element instanceof ExtractExpression || element instanceof SliceExpression) {
                let gid = element.source.toString();
                if (gid === groupId && isAdjacent(group, element)) {
                    group.push(element);
                }
                else {
                    compressGroup(this.children, group);
                    groupId = gid;
                    group = [element];
                }
            }
        }

        compressGroup(this.children, group);
        const newChildren = this.children.filter(c => c !== undefined);
        this.children.length = 0;
        newChildren.forEach(c => this.children.push(c));
    }

    toString(options: AssemblyOptions = {}): string {
        const list = this.elements.map(e => e.toString({ vectorAsList: true })).join(' ');
        return options.vectorAsList ? list : `(vector ${list})`;
    }
}

// HELPER FUNCTIONS
// ================================================================================================
function isAdjacent(group: (ExtractExpression | SliceExpression)[], element: ExtractExpression | SliceExpression): boolean {
    if (group.length < 1) return false;
    const groupEnd = group[group.length - 1].end;
    return (element.start - 1) === groupEnd;
}

function compressGroup(elements: Expression[], group: (ExtractExpression | SliceExpression)[]) {
    if (group.length < 2) return;
    
    const firstElement = group[0], lastElement = group[group.length - 1];
    let i = elements.indexOf(firstElement);
    elements[i] = new SliceExpression(firstElement.source, firstElement.start, lastElement.end);
    i++;

    for (let j = 1; j < group.length; j++, i++) {
        elements[i] = undefined as any;
    }
}