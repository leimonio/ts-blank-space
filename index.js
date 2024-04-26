// Copyright 2023 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
// @ts-check
import ts from "typescript";
import BlankString from "./blank-string.js";

/**
 * @type {ts.CreateSourceFileOptions}
 */
const languageOptions = {
    languageVersion: ts.ScriptTarget.ESNext,
    jsDocParsingMode: ts.JSDocParsingMode.ParseNone,
    impliedNodeFormat: ts.ModuleKind.ESNext,
};

// State is hoisted to module scope so we can avoid making so many closures

const scanner = ts.createScanner(ts.ScriptTarget.ESNext, /*skipTrivia: */true, ts.LanguageVariant.Standard);
scanner.setJSDocParsingMode(ts.JSDocParsingMode.ParseNone);

let str = new BlankString("");

/** @type {ts.SourceFile} */
let ast;

/** @type {undefined | ((n: ts.Node) => void)} */
let onError;

/**
 * @param {string} input
 * @param {typeof onError} [onErrorArg]
 * @returns {string}
 */
export default function tsBlankSpace(input, onErrorArg) {
    try {
        str = new BlankString(input);
        onError = onErrorArg;

        scanner.setText(input);
        ast = ts.createSourceFile("input.ts", input, languageOptions, /* setParentNodes: */ false, ts.ScriptKind.TS);

        ast.forEachChild(visitTop);

        return str.toString();
    } finally {
        // cleanup. Release memory.
        scanner.setText("");
        onError = undefined;
        ast = /** @type {any} */(undefined);
        str = /** @type {any} */(undefined);
    }
}

const {
    Identifier,
    VariableDeclaration,
    VariableStatement,
    InterfaceDeclaration,
    TypeAliasDeclaration,
    ClassDeclaration,
    ClassExpression,
    ExpressionWithTypeArguments,
    PropertyDeclaration,
    IndexSignature,
    NonNullExpression,
    AsExpression,
    SatisfiesExpression,
    Constructor,
    MethodDeclaration,
    FunctionDeclaration,
    ArrowFunction,
    FunctionExpression,
    GetAccessor,
    SetAccessor,
    ImportDeclaration,
    ExportDeclaration,
    EnumDeclaration,
    ModuleDeclaration,
    PrivateKeyword,
    ProtectedKeyword,
    PublicKeyword,
    AbstractKeyword,
    OverrideKeyword,
    DeclareKeyword,
    ReadonlyKeyword,
    CommaToken,
    GreaterThanToken,
    LessThanToken,
    ImplementsKeyword,
    ExtendsKeyword,
    NewExpression,
    CallExpression,
} = ts.SyntaxKind;

/**
 * @param {ts.Node} node
 * @returns {void}
 */
function visitTop(node) {
    const n = /** @type {any} */(node);
    switch (node.kind) {
        case ImportDeclaration: visitImportDeclaration(n); return;
        case ExportDeclaration: visitExportDeclaration(n); return;
    }

    visitor(node);
}

/**
 * @param {ts.Node} node
 * @returns {void}
 */
function visitor(node) {
    const n = /** @type {any} */(node);
    switch (node.kind) {
        case Identifier: return;
        case VariableDeclaration: visitVariableDeclaration(n); return;
        case VariableStatement: visitVariableStatement(n); return;
        case CallExpression:
        case NewExpression: visitCallOrNewExpression(n); return;
        case TypeAliasDeclaration:
        case InterfaceDeclaration: blankNode(n); return;
        case ClassDeclaration:
        case ClassExpression: visitClassLike(n); return;
        case ExpressionWithTypeArguments: visitExpressionWithTypeArguments(n); return;
        case PropertyDeclaration: visitPropertyDeclaration(n); return;
        case NonNullExpression: visitNonNullExpression(n); return;
        case SatisfiesExpression:
        case AsExpression: visitTypeAssertion(n); return;
        case ArrowFunction:
        case FunctionDeclaration:
        case MethodDeclaration:
        case Constructor:
        case FunctionExpression:
        case GetAccessor:
        case SetAccessor:
            visitFunctionLikeDeclaration(n); return;
        case EnumDeclaration:
        case ModuleDeclaration: visitEnumOrModule(n); return;
        case IndexSignature: blankNode(n); return;
    }

    node.forEachChild(visitor);
}

/**
 * `let x : T` (outer)
 * @param {ts.VariableStatement} node
 */
function visitVariableStatement(node) {
    if (node.modifiers && modifiersContainsDeclare(node.modifiers)) {
        blankExact(node);
        return;
    }
    node.forEachChild(visitor);
}

/**
 * `new Set<string>()` | `foo<string>()`
 * @param {ts.NewExpression | ts.CallExpression} node
 */
function visitCallOrNewExpression(node) {
    visitor(node.expression);
    if (node.typeArguments) {
        blankGenerics(node, node.typeArguments);
    }
    if (node.arguments) {
        for (let i = 0; i < node.arguments.length; i++) {
            visitor(node.arguments[i]);
        }
    }
}

/**
 * `let x : T = v` (inner)
 * @param {ts.VariableDeclaration} node
 */
function visitVariableDeclaration(node) {
    node.type && blankTypeNode(node.type);
    if (node.initializer) {
        visitor(node.initializer);
    }
}

/**
 * `class ...`
 * @param {ts.ClassLikeDeclaration} node
 */
function visitClassLike(node) {
    if (node.modifiers) {
        if (modifiersContainsDeclare(node.modifiers)) {
            blankExact(node);
            return;
        }
        visitModifiers(node.modifiers);
    }

    // ... <T>
    if (node.typeParameters && node.typeParameters.length) {
        blankGenerics(node, node.typeParameters);
    }

    const {heritageClauses} = node;
    if (heritageClauses) {
        for (let i = 0; i < heritageClauses.length; i++) {
            const hc = heritageClauses[i];
            // implements T
            if (hc.token === ImplementsKeyword) {
                blankExact(hc);
            }
            // ... extends C<T> ...
            else if (hc.token === ExtendsKeyword) {
                hc.forEachChild(visitor);
            }
        }
    }
    node.members.forEach(visitor);
}

/**
 * Exp<T>
 * @param {ts.ExpressionWithTypeArguments} node
 */
function visitExpressionWithTypeArguments(node) {
    if (node.typeArguments) {
        visitor(node.expression);
        blankGenerics(node, node.typeArguments);
    }
}

/**
 * @param {ArrayLike<ts.ModifierLike>} modifiers
 */
function visitModifiers(modifiers) {
    for (let i = 0; i < modifiers.length; i++) {
        const modifier = modifiers[i];
        switch (modifier.kind) {
            case PrivateKeyword:
            case ProtectedKeyword:
            case PublicKeyword:
            case AbstractKeyword:
            case OverrideKeyword:
            case DeclareKeyword:
            case ReadonlyKeyword:
                blankExact(modifier);
                continue;
        }

        // at runtime skip the remaining checks
        // these are here only as a compile-time exhaustive check
        const trueAsFalse = /** @type {false} */(true);
        if (trueAsFalse) continue;

        switch (modifier.kind) {
            case ts.SyntaxKind.ConstKeyword:
            case ts.SyntaxKind.DefaultKeyword:
            case ts.SyntaxKind.ExportKeyword:
            case ts.SyntaxKind.InKeyword:
            case ts.SyntaxKind.StaticKeyword:
            case ts.SyntaxKind.AccessorKeyword:
            case ts.SyntaxKind.AsyncKeyword:
            case ts.SyntaxKind.OutKeyword:
            case ts.SyntaxKind.Decorator:
                continue;
            default:
                never(modifier);
        }
    }
}

/**
 * prop: T
 * @param {ts.PropertyDeclaration} node
 */
function visitPropertyDeclaration(node) {
    if (node.modifiers) {
        if (modifiersContainsAbstractOrDeclare(node.modifiers)) {
            blankExact(node);
            return;
        }
        visitModifiers(node.modifiers);
    }
    node.exclamationToken && blankExact(node.exclamationToken);
    node.questionToken && blankExact(node.questionToken);
    node.type && blankTypeNode(node.type);

    if (node.initializer) {
        visitor(node.initializer);
    }
}

/**
 * `expr!`
 * @param {ts.NonNullExpression} node
 */
function visitNonNullExpression(node) {
    visitor(node.expression);
    str.blank(node.end - 1, node.end)
}

/**
 * `exp satisfies T, exp as T`
 * @param {ts.SatisfiesExpression | ts.AsExpression} node
 */
function visitTypeAssertion(node) {
    visitor(node.expression);
    str.blank(node.expression.end, node.end);
}

/**
 * `function<T>(p: T): T {}`
 * @param {ts.FunctionLikeDeclaration} node
 */
function visitFunctionLikeDeclaration(node) {
    if (!node.body) {
        // overload
        blankExact(node);
        return;
    }
    if (node.modifiers) {
        if (modifiersContainsDeclare(node.modifiers)) {
            blankExact(node);
            return;
        }
        visitModifiers(node.modifiers);
    }

    if (node.typeParameters && node.typeParameters.length) {
        blankGenerics(node, node.typeParameters);
    }

    for (let i = 0; i < node.parameters.length; i++) {
        const p = node.parameters[i];
        if (i === 0 && p.name.getText(ast) === "this") {
            const commaAdjust = node.parameters.length > 1 ? 1 : 0;
            str.blank(p.getStart(ast), p.end + commaAdjust);
            continue;
        }
        if (p.modifiers) {
            // error on non-standard parameter properties
            for (let i = 0; i < p.modifiers.length; i++) {
                const mod = p.modifiers[i];
                switch (mod.kind) {
                    case PublicKeyword:
                    case ProtectedKeyword:
                    case PrivateKeyword:
                    case ReadonlyKeyword:
                        onError && onError(mod);
                }
            }
        }
        p.questionToken && blankExact(p.questionToken);
        p.type && blankTypeNode(p.type);
        p.initializer && visitor(p.initializer);
    }
    node.type && blankTypeNode(node.type);

    visitor(node.body);
}

/**
 * `import ...`
 * @param {ts.ImportDeclaration} node
 */
function visitImportDeclaration(node) {
    if (node.importClause) {
        if (node.importClause.isTypeOnly) {
            blankExact(node);
            return;
        }
        const {namedBindings} = node.importClause;
        if (namedBindings && ts.isNamedImports(namedBindings)) {
            const elements = namedBindings.elements;
            for (let i = 0; i < elements.length; i++) {
                const e = elements[i];
                e.isTypeOnly && blankExactAndOptionalTrailingComma(e);
            }
        }
    }
}

/**
 * `export ...`
 * @param {ts.ExportDeclaration} node
 */
function visitExportDeclaration(node) {
    if (node.isTypeOnly) {
        blankExact(node);
        return;
    }

    const {exportClause} = node;
    if (exportClause && ts.isNamedExports(exportClause)) {
        const elements = exportClause.elements;
        for (let i = 0; i < elements.length; i++) {
            const e = elements[i];
            e.isTypeOnly && blankExactAndOptionalTrailingComma(e);
        }
    }
}

/**
 * @param {ts.EnumDeclaration | ts.ModuleDeclaration} node
 * @returns {void}
 */
function visitEnumOrModule(node) {
    if (node.modifiers && modifiersContainsDeclare(node.modifiers)) {
        str.blank(node.getFullStart(), node.end);
    } else {
        onError && onError(node);
    }
}

/**
 * @param {ArrayLike<ts.ModifierLike>} modifiers
 */
function modifiersContainsDeclare(modifiers) {
    for (let i = 0; i < modifiers.length; i++) {
        const modifier = modifiers[i];
        if (modifier.kind === DeclareKeyword) {
            return true;
        }
    }
    return false;
}

/**
 * @param {ArrayLike<ts.ModifierLike>} modifiers
 */
function modifiersContainsAbstractOrDeclare(modifiers) {
    for (let i = 0; i < modifiers.length; i++) {
        const modifier = modifiers[i];
        if (modifier.kind === AbstractKeyword || modifier.kind === DeclareKeyword) {
            return true;
        }
    }
    return false;
}

/** < */
function getLessThanToken() {
    while (scanner.scan() !== LessThanToken);
    return scanner.getTokenStart();
}
/** > */
function getGreaterThanToken() {
    while (scanner.scan() !== GreaterThanToken);
    return scanner.getTokenEnd();
}

/** @param {ts.Node} n  */
function blankNode(n) {
    str.blank(n.getFullStart(), n.end);
}

/** @param {ts.TypeNode} n  */
function blankTypeNode(n) {
    // -1 for `:`
    str.blank(n.getFullStart() - 1, n.end);
}

/** @param {ts.Node} n  */
function blankExact(n) {
    str.blank(n.getStart(ast), n.end);
}

/** @param {ts.Node} n  */
function blankExactAndOptionalTrailingComma(n) {
    scanner.resetTokenState(n.end);
    const trailingComma = scanner.scan() === CommaToken;
    str.blank(n.getStart(ast), trailingComma ? scanner.getTokenEnd() : n.end);
}

/**
 * `<T1, T2>`
 * @param {ts.Node} node
 * @param {ts.NodeArray} arr
 */
function blankGenerics(node, arr) {
    const start = scanner.scanRange(
        node.getStart(ast),
        arr[0].getFullStart(),
        getLessThanToken
    );
    const end = scanner.scanRange(
        arr[arr.length-1].getEnd(),
        node.end,
        getGreaterThanToken
    );
    str.blank(start, end);
}

/**
 * @param {never} n
 * @return {never}
 */
function never(n) {
    throw new Error("unreachable code was reached");
}
