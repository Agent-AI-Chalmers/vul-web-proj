import React, { useState } from 'react';

const ExternalTools: React.FC = () => {
    const [expression, setExpression] = useState<string>('');
    const [result, setResult] = useState<string>('');

    const safeEvaluate = (expr: string): number | null => {
        // Only allow numbers, operators, parentheses, spaces, and decimal points
        const safePattern = /^[\d\s+\-*/().]+$/;
        if (!safePattern.test(expr)) {
            return null;
        }
        
        // Additional check: no empty parentheses or unbalanced parentheses
        let depth = 0;
        for (const char of expr) {
            if (char === '(') depth++;
            if (char === ')') depth--;
            if (depth < 0) return null;
        }
        if (depth !== 0) return null;

        // Use Function constructor with restricted scope
        try {
            const evaluated = new Function('return ' + expr)();
            if (typeof evaluated === 'number' && !isNaN(evaluated) && isFinite(evaluated)) {
                return evaluated;
            }
            return null;
        } catch {
            return null;
        }
    };

    const handleCalculate = () => {
        try {
            // Safely evaluate mathematical expressions
            const res = safeEvaluate(expression);
            if (res === null) {
                setResult('Error: Invalid expression');
            } else {
                setResult(res.toString());
            }
        } catch (e) {
            setResult('Error: ' + (e as Error).message);
        }
    }

    return (
        <div className="p-4 border rounded shadow-sm bg-blue-50 mt-4">
            <h3 className="text-lg font-bold mb-2">Internal Tool: Quick Math</h3>
            <p className="text-sm text-gray-600 mb-2 italic">Developer only: evaluate expressions quickly.</p>
            <input 
                type="text" 
                value={expression} 
                onChange={(e) => setExpression(e.target.value)}
                placeholder="e.g. 2 + 2"
                className="w-full p-2 border rounded"
            />
            <button 
                onClick={handleCalculate}
                className="mt-2 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 w-full"
            >
                Calculate
            </button>
            {result && (
                <div className="mt-2 font-mono p-2 bg-white border border-gray-200">
                    Result: {result}
                </div>
            )}
        </div>
    )
}

export default ExternalTools;
