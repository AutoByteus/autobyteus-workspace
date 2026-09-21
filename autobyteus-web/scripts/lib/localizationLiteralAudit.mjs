import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const TEMPLATE_FILE_EXTENSIONS = new Set(['.vue']);
const TS_FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const STATIC_ATTRIBUTE_PATTERN = /(?<![-:@])\b(?:aria-label|title|alt|label|description)=(['"])(.+?)\1/g;
const STRICT_STATIC_ATTRIBUTE_PATTERN = /(?<![-:@])\b(?:aria-label|title|alt|label|description|placeholder)=(['"])(.+?)\1/g;
const BOUND_PRESENTATION_ATTRIBUTE_PATTERN = /(?<![-@]):(?:aria-label|title|alt|label|description|placeholder)=(['"])([\s\S]*?)\1/g;
const TEMPLATE_EXPRESSION_PATTERN = /{{([\s\S]*?)}}/g;
const MIXED_TEXT_NODE_PATTERN = />\s*([^<\n]*{{[\s\S]*?}}[^<\n]*)\s*</g;
const TEXT_NODE_PATTERN = />\s*([^<>{\n][^<>{]*?)\s*</g;
const IGNORED_FILE_PATTERNS = [/\.spec\./, /\.test\./, /\/__tests__\//, /\/tests\//];
const VUE_SCRIPT_AUDIT_FILE_PATTERN = /components\/(?:app\/AppUpdateNotice|settings\/AboutSettingsManager|settings\/VoiceInputExtensionCard)\.vue$/;
const TS_FEEDBACK_FILE_PATTERN = /(useRightSideTabs|messaging|appUpdate|extensions|voiceInput).*?\.(?:t|j)sx?$/i;
const UI_PROPERTY_NAMES = new Set([
  'label',
  'message',
  'detail',
  'title',
  'description',
  'summary',
  'placeholder',
  'text',
  'subtitle',
  'help',
  'ariaLabel',
  'confirmButtonText',
  'lastError',
  'error',
  'group',
]);
const UI_IDENTIFIER_PATTERN = /(?:label|message|detail|title|description|summary|placeholder|ariaLabel|buttonLabel|buttonText|helpText|emptyText|errorText|statusLabel|statusMessage|versionSummary|currentVersionLabel|lastCheckedLabel|pendingActionLabel|installPhaseLabel|installMessage|audioInputStatusMessage|settingsTestButtonLabel|settingsTestOutcomeLabel|settingsTestOutcomeDescription|extensionStatusMessage|[A-Za-z0-9]*Error)$/i;
const UI_FUNCTION_PATTERN = /(?:build.*Error|.*Label|.*Message|.*Title|.*Description|.*Summary)$/i;
const ALLOWED_LITERAL_PATTERNS = [
  /^https?:\/\//,
  /^\.\.?\//,
  /^#/, 
  /^~/,
  /^@\//,
  /^[A-Z0-9_:-]+$/,
  /^(?:[A-Za-z0-9]+(?:\.[A-Za-z0-9_-]+)+|[a-z]{2}(?:-[A-Z]{2})?)$/,
  /^[a-z0-9_.:-]+$/,
  /^\/[A-Za-z0-9/_-]+$/,
  /^\d+(?:\.\d+)?(?:px|rem|em|%)?$/,
  /^text-[a-z0-9-]+$/,
  /^bg-[a-z0-9-]+$/,
  /^border-[a-z0-9-]+$/,
  /^[a-z][A-Za-z0-9.]*$/,
];

function shouldIgnoreLiteral(literal) {
  const value = literal.trim();
  if (!value) return true;
  if (value.includes('{{expr}}') && !/[A-Za-z]/.test(value.replaceAll('{{expr}}', ''))) return true;
  if (!/[A-Za-z]/.test(value)) return true;
  if (value.includes('$t(') || value.includes('localizationRuntime.translate(') || value.includes('t(')) {
    return true;
  }
  if (value.includes('${') || value.includes('`')) return true;
  if (['smooth', 'start', 'center', 'end', 'top', 'bottom', 'left', 'right'].includes(value)) {
    return true;
  }
  return ALLOWED_LITERAL_PATTERNS.some((pattern) => pattern.test(value));
}

function shouldIgnoreTemplateLiteral(literal) {
  const value = literal.trim();
  if (shouldIgnoreLiteral(value)) return true;
  if (value.includes('\n')) return true;
  if (value.includes('{{') || value.includes('}}')) return true;
  if (value.endsWith('...') || value.endsWith('…')) return true;
  if (!/\s/.test(value) && !/[.?!:]/.test(value)) return true;
  return false;
}

function shouldIgnoreStrictTemplateLiteral(literal) {
  const value = literal.trim();
  if (shouldIgnoreLiteral(value)) return true;
  if (value.includes('\n')) return true;
  return false;
}

function shouldIgnoreFile(filePath) {
  return IGNORED_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function getNodeTextIfLiteral(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text.trim();
  }
  if (ts.isTemplateExpression(node)) {
    const text = [node.head.text, ...node.templateSpans.map((span) => `{{expr}}${span.literal.text}`)].join('').trim();
    return text;
  }
  return null;
}

function getNodeName(node) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) {
    return node.text;
  }
  if (ts.isStringLiteral(node)) {
    return node.text;
  }
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text;
  }
  return null;
}

function isIgnorableAstContext(node) {
  return ts.isImportDeclaration(node)
    || ts.isExportDeclaration(node)
    || ts.isImportEqualsDeclaration(node)
    || ts.isLiteralTypeNode(node)
    || ts.isModuleDeclaration(node)
    || ts.isPropertySignature(node)
    || ts.isTypeAliasDeclaration(node)
    || ts.isInterfaceDeclaration(node)
    || ts.isEnumMember(node);
}

function isUiPropertyAssignment(node) {
  if (!ts.isPropertyAssignment(node)) return false;
  const name = getNodeName(node.name);
  return Boolean(name && UI_PROPERTY_NAMES.has(name));
}

function isUiIdentifierInitializer(node) {
  if (ts.isVariableDeclaration(node) || ts.isParameter(node)) {
    const name = getNodeName(node.name);
    return Boolean(name && UI_IDENTIFIER_PATTERN.test(name));
  }

  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    const name = ts.isPropertyAccessExpression(node.left) && node.left.name.text === 'value'
      ? getNodeName(node.left.expression)
      : getNodeName(node.left);
    return Boolean(name && UI_IDENTIFIER_PATTERN.test(name));
  }

  return false;
}

function isUiCallArgument(node, literalNode, options = {}) {
  const { allowErrorConstruction = false } = options;
  if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return false;
  if (!node.arguments?.includes(literalNode)) return false;

  const calleeName = getNodeName(node.expression);
  if (!calleeName) return false;

  if (['addToast', 'showToast', 'toast'].includes(calleeName)) return true;
  return allowErrorConstruction && ts.isNewExpression(node) && calleeName === 'Error';
}

function getFunctionLikeOwnerName(node) {
  let current = node.parent;

  while (current) {
    if (ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current) || ts.isGetAccessorDeclaration(current)) {
      return getNodeName(current.name);
    }

    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      const parent = current.parent;
      if (ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent)) {
        return getNodeName(parent.name);
      }
      if (ts.isCallExpression(parent)) {
        const container = parent.parent;
        if (ts.isVariableDeclaration(container) || ts.isPropertyAssignment(container)) {
          return getNodeName(container.name);
        }
      }
      if (ts.isBinaryExpression(parent)) {
        return getNodeName(parent.left);
      }
    }

    current = current.parent;
  }

  return null;
}

function isRelevantScriptLiteralContext(node, options = {}) {
  const {
    allowUiIdentifierInitializers = false,
    allowUiNamedReturns = false,
    allowErrorConstruction = false,
  } = options;
  let current = node.parent;

  while (current) {
    if (isIgnorableAstContext(current)) {
      return false;
    }

    if (isUiPropertyAssignment(current) || isUiCallArgument(current, node, { allowErrorConstruction })) {
      return true;
    }

    if (allowUiIdentifierInitializers && isUiIdentifierInitializer(current)) {
      return true;
    }

    if (allowUiNamedReturns && ts.isReturnStatement(current)) {
      const ownerName = getFunctionLikeOwnerName(current);
      return Boolean(ownerName && (UI_IDENTIFIER_PATTERN.test(ownerName) || UI_FUNCTION_PATTERN.test(ownerName)));
    }

    current = current.parent;
  }

  return false;
}

function collectFiles(appRoot, includePath) {
  const absolutePath = path.join(appRoot, includePath);
  if (!fs.existsSync(absolutePath)) return [];

  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    return shouldIgnoreFile(absolutePath) ? [] : [absolutePath];
  }

  const files = [];
  const stack = [absolutePath];
  while (stack.length > 0) {
    const currentPath = stack.pop();
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const fullPath = path.join(currentPath, entry.name);
      if (shouldIgnoreFile(fullPath)) continue;
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      const ext = path.extname(entry.name);
      if (TEMPLATE_FILE_EXTENSIONS.has(ext) || TS_FILE_EXTENSIONS.has(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function extractTemplateContent(content) {
  const match = content.match(/<template>([\s\S]*?)<\/template>/);
  return match ? match[1] : null;
}

function extractScriptBlocks(content) {
  const blocks = [];
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
  let match;

  while ((match = scriptPattern.exec(content)) !== null) {
    const attributes = match[1] || '';
    const body = match[2] || '';
    const isTs = /\blang=['"]ts['"]/.test(attributes);
    blocks.push({
      body,
      extension: isTs ? '.ts' : '.js',
    });
  }

  return blocks;
}

function collectTemplateExpressionFindings({ expression, file, scopeId, findings }) {
  const sourceFile = ts.createSourceFile(
    `${file}#template-expression`,
    `const __localizedPresentation = (${expression});`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const visit = (node) => {
    const literal = getNodeTextIfLiteral(node);
    if (literal && !shouldIgnoreLiteral(literal)) {
      findings.push({ scopeId, file, finding: literal, status: 'unresolved' });
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

function collectVueFindings({ content, file, scopeId, findings, strictVueLiterals = false }) {
  const templateContent = extractTemplateContent(content);
  if (templateContent) {
    const sanitizedTemplate = templateContent.replace(/<!--([\s\S]*?)-->/g, ' ');

    const staticAttributePattern = strictVueLiterals ? STRICT_STATIC_ATTRIBUTE_PATTERN : STATIC_ATTRIBUTE_PATTERN;
    for (const pattern of [staticAttributePattern, TEXT_NODE_PATTERN]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(sanitizedTemplate)) !== null) {
        const literal = (match[2] ?? match[1] ?? '').trim();
        if ((strictVueLiterals ? shouldIgnoreStrictTemplateLiteral(literal) : shouldIgnoreTemplateLiteral(literal))) continue;
        findings.push({ scopeId, file, finding: literal, status: 'unresolved' });
      }
    }

    if (strictVueLiterals) {
      MIXED_TEXT_NODE_PATTERN.lastIndex = 0;
      let mixedMatch;
      while ((mixedMatch = MIXED_TEXT_NODE_PATTERN.exec(sanitizedTemplate)) !== null) {
        const literal = mixedMatch[1].replace(/{{[\s\S]*?}}/g, '').trim();
        if (shouldIgnoreStrictTemplateLiteral(literal)) continue;
        findings.push({ scopeId, file, finding: literal, status: 'unresolved' });
      }

      for (const pattern of [TEMPLATE_EXPRESSION_PATTERN, BOUND_PRESENTATION_ATTRIBUTE_PATTERN]) {
        pattern.lastIndex = 0;
        let expressionMatch;
        while ((expressionMatch = pattern.exec(sanitizedTemplate)) !== null) {
          const expression = (expressionMatch[2] ?? expressionMatch[1] ?? '').trim();
          if (!expression) continue;
          collectTemplateExpressionFindings({ expression, file, scopeId, findings });
        }
      }
    }
  }

  if (strictVueLiterals || VUE_SCRIPT_AUDIT_FILE_PATTERN.test(file)) {
    for (const [index, scriptBlock] of extractScriptBlocks(content).entries()) {
      collectScriptFindings({
        content: scriptBlock.body,
        file: `${file}#script-${index + 1}`,
        scopeId,
        findings,
        extension: scriptBlock.extension,
        contextOptions: {
          allowUiIdentifierInitializers: true,
          allowUiNamedReturns: true,
          allowErrorConstruction: true,
        },
      });
    }
  }
}

function collectScriptFindings({ content, file, scopeId, findings, extension, contextOptions }) {
  if (!file.includes('#script-') && !TS_FEEDBACK_FILE_PATTERN.test(file)) {
    return;
  }

  const scriptKind = extension === '.tsx'
    ? ts.ScriptKind.TSX
    : extension === '.jsx'
      ? ts.ScriptKind.JSX
      : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, scriptKind);

  const visit = (node) => {
    const literal = getNodeTextIfLiteral(node);
    if (literal && isRelevantScriptLiteralContext(node, contextOptions) && !shouldIgnoreLiteral(literal)) {
      findings.push({ scopeId, file, finding: literal, status: 'unresolved' });
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

export function auditLocalizationLiterals({ appRoot, scopes }) {
  const findings = [];

  for (const scope of scopes) {
    const scopeFiles = new Set(scope.include.flatMap((includePath) => collectFiles(appRoot, includePath)));
    for (const filePath of scopeFiles) {
      const relativePath = path.relative(appRoot, filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      if (filePath.endsWith('.vue')) {
        collectVueFindings({
          content,
          file: relativePath,
          scopeId: scope.scopeId,
          findings,
          strictVueLiterals: scope.strictVueLiterals === true,
        });
        continue;
      }
      collectScriptFindings({
        content,
        file: relativePath,
        scopeId: scope.scopeId,
        findings,
        extension: path.extname(filePath),
        contextOptions: {
          allowUiIdentifierInitializers: false,
          allowUiNamedReturns: false,
          allowErrorConstruction: false,
        },
      });
    }
  }

  return findings;
}
