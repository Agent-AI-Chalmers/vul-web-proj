import React, { useState } from 'react';

const ExternalTools: React.FC = () => {
    const [expression, setExpression] = useState<string>('');
    const [result, setResult] = useState<string>('');

    const handleCalculate = () => {
        try {
            // Safe math expression evaluation - only allow numeric operations
            const safeExpression = expression.trim();
            
            // Validate: only allow numbers, operators, parentheses, decimal points, and spaces
            if (!/^[\d\s+\-*/().]+$/.test(safeExpression)) {
                setResult('Error: Invalid characters in expression');
                return;
            }
            
            // Use Function constructor with restricted scope for math evaluation
            const res = new Function('return ' + safeExpression)();
            
            if (typeof res === 'number' && isFinite(res)) {
                setResult(res.toString());
            } else {
                setResult('Error: Invalid result');
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
