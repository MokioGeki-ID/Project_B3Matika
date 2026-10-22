/**
 * Safe Math Expression Evaluator
 * NO eval(), NO new Function(), NO arbitrary code execution
 * Supports: +, -, *, /, ^, (), sin, cos, tan, sqrt, abs, ln, log, pi, e
 */

const CONSTANTS = {
  pi: Math.PI,
  e: Math.E
};

const FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round
};

// Tokenize expression
function tokenize(expr) {
  const tokens = [];
  let i = 0;
  
  while (i < expr.length) {
    const char = expr[i];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    // Numbers (including decimals)
    if (/\d/.test(char)) {
      let num = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(num) });
      continue;
    }
    
    // Variables and functions
    if (/[a-z]/i.test(char)) {
      let name = '';
      while (i < expr.length && /[a-z]/i.test(expr[i])) {
        name += expr[i];
        i++;
      }
      
      // Check if it's a function (followed by '(')
      if (i < expr.length && expr[i] === '(') {
        if (!FUNCTIONS[name]) {
          throw new Error(`Unknown function: ${name}`);
        }
        tokens.push({ type: 'FUNCTION', value: name });
      } else {
        // It's a variable or constant
        tokens.push({ type: 'VARIABLE', value: name });
      }
      continue;
    }
    
    // Operators and parentheses
    if ('+-*/^()'.includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }
    
    throw new Error(`Invalid character: ${char}`);
  }
  
  return tokens;
}

// Parse and evaluate expression (Recursive Descent Parser)
class ExpressionParser {
  constructor(tokens, variables = {}) {
    this.tokens = tokens;
    this.pos = 0;
    this.variables = { ...CONSTANTS, ...variables };
  }
  
  peek() {
    return this.tokens[this.pos];
  }
  
  consume() {
    return this.tokens[this.pos++];
  }
  
  // Expression: Term ((+|-) Term)*
  parseExpression() {
    let left = this.parseTerm();
    
    while (this.peek() && this.peek().type === 'OPERATOR' && '+-'.includes(this.peek().value)) {
      const op = this.consume().value;
      const right = this.parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    
    return left;
  }
  
  // Term: Factor ((*|/) Factor)*
  parseTerm() {
    let left = this.parsePower();
    
    while (this.peek() && this.peek().type === 'OPERATOR' && '*/'.includes(this.peek().value)) {
      const op = this.consume().value;
      const right = this.parsePower();
      
      if (op === '*') {
        left = left * right;
      } else {
        if (right === 0) {
          return NaN; // Division by zero
        }
        left = left / right;
      }
    }
    
    return left;
  }
  
  // Power: Factor (^ Factor)*
  parsePower() {
    let left = this.parseFactor();
    
    while (this.peek() && this.peek().type === 'OPERATOR' && this.peek().value === '^') {
      this.consume(); // consume ^
      const right = this.parseFactor();
      left = Math.pow(left, right);
    }
    
    return left;
  }
  
  // Factor: NUMBER | VARIABLE | FUNCTION(Expression) | (Expression) | -Factor
  parseFactor() {
    const token = this.peek();
    
    if (!token) {
      throw new Error('Unexpected end of expression');
    }
    
    // Unary minus
    if (token.type === 'OPERATOR' && token.value === '-') {
      this.consume();
      return -this.parseFactor();
    }
    
    // Unary plus
    if (token.type === 'OPERATOR' && token.value === '+') {
      this.consume();
      return this.parseFactor();
    }
    
    // Number
    if (token.type === 'NUMBER') {
      this.consume();
      return token.value;
    }
    
    // Variable or constant
    if (token.type === 'VARIABLE') {
      this.consume();
      const name = token.value;
      
      if (!(name in this.variables)) {
        throw new Error(`Undefined variable: ${name}`);
      }
      
      return this.variables[name];
    }
    
    // Function
    if (token.type === 'FUNCTION') {
      const func = FUNCTIONS[token.value];
      this.consume(); // consume function name
      
      if (!this.peek() || this.peek().value !== '(') {
        throw new Error('Expected ( after function name');
      }
      this.consume(); // consume (
      
      const arg = this.parseExpression();
      
      if (!this.peek() || this.peek().value !== ')') {
        throw new Error('Expected ) after function argument');
      }
      this.consume(); // consume )
      
      return func(arg);
    }
    
    // Parentheses
    if (token.type === 'OPERATOR' && token.value === '(') {
      this.consume(); // consume (
      const result = this.parseExpression();
      
      if (!this.peek() || this.peek().value !== ')') {
        throw new Error('Expected )');
      }
      this.consume(); // consume )
      
      return result;
    }
    
    throw new Error(`Unexpected token: ${token.value}`);
  }
  
  parse() {
    const result = this.parseExpression();
    
    if (this.peek()) {
      throw new Error(`Unexpected token: ${this.peek().value}`);
    }
    
    return result;
  }
}

/**
 * Evaluate math expression safely
 * @param {string} expr - Expression like "2*x + sin(x)"
 * @param {object} variables - Variable values like {x: 5}
 * @returns {number} - Result or NaN if error
 */
export function evaluate(expr, variables = {}) {
  try {
    // Security check: block dangerous patterns
    const dangerous = ['constructor', 'prototype', '__proto__', 'window', 'document', 'global', 'process', 'require', 'import', 'eval', 'Function'];
    for (const pattern of dangerous) {
      if (expr.toLowerCase().includes(pattern.toLowerCase())) {
        throw new Error('Expression contains forbidden pattern');
      }
    }
    
    const tokens = tokenize(expr);
    const parser = new ExpressionParser(tokens, variables);
    return parser.parse();
  } catch (err) {
    console.error('Math evaluation error:', err);
    return NaN;
  }
}

/**
 * Test if expression is safe and valid
 */
export function isValidExpression(expr) {
  try {
    evaluate(expr, { x: 0 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate function points for plotting
 * @param {string} expr - Expression like "x^2"
 * @param {number} xMin - Min x value
 * @param {number} xMax - Max x value
 * @param {number} points - Number of sample points (default 200, max 400)
 * @returns {Array} - Array of {x, y} points
 */
export function generatePoints(expr, xMin, xMax, points = 200) {
  points = Math.min(points, 400); // Security: limit max points
  const step = (xMax - xMin) / points;
  const result = [];
  
  for (let i = 0; i <= points; i++) {
    const x = xMin + i * step;
    const y = evaluate(expr, { x });
    
    // Only add valid points
    if (isFinite(y)) {
      result.push({ x, y });
    }
  }
  
  return result;
}
