'use client';

import { useState } from 'react';

export default function TestSMSPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testSMS = async () => {
    setLoading(true);
    setResult('Testing SMS... Check server terminal for 📱 messages.\n\n');
    
    try {
      // Create a test entry first
      const testEntryResponse = await fetch('/api/test-sms-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const testData = await testEntryResponse.json();
      
      if (testEntryResponse.ok) {
        setResult(prev => prev + `✅ Test entry created (ID: ${testData.entryId})\n\n`);
        setResult(prev => prev + `📱 Check the TERMINAL where 'npm run dev' is running.\n`);
        setResult(prev => prev + `📱 Look for messages starting with 📱 (SMS emoji).\n\n`);
        setResult(prev => prev + `SMS Results: ${JSON.stringify(testData.smsResult, null, 2)}\n\n`);
        setResult(prev => prev + `\nCheck your phone - did you receive an SMS?`);
      } else {
        setResult(prev => prev + `❌ Error: ${testData.error || 'Unknown error'}\n\n`);
        setResult(prev => prev + `Check the server terminal for error messages.`);
      }
    } catch (error) {
      setResult(prev => prev + `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`);
      setResult(prev => prev + `Check the server terminal for error messages.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-white dark:bg-[#000000]">
      <h1 className="text-2xl font-bold mb-4 text-black dark:text-[#ffffff]">SMS Test Page</h1>
      
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-300 dark:border-blue-700 rounded">
        <p className="text-sm text-blue-900 dark:text-blue-300 font-semibold mb-2">
          This page will create a test entry and send SMS notifications.
        </p>
        <p className="text-sm text-blue-900 dark:text-blue-300">
          <strong>Important:</strong> Check the TERMINAL where 'npm run dev' is running (not the browser) for detailed logs.
        </p>
      </div>

      <button
        onClick={testSMS}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded font-bold hover:bg-blue-700 disabled:bg-gray-400 mb-4"
      >
        {loading ? 'Testing...' : 'Test SMS Notification'}
      </button>

      {result && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-300 dark:border-gray-700 rounded">
          <h2 className="text-lg font-bold mb-2 text-black dark:text-[#ffffff]">Result:</h2>
          <pre className="whitespace-pre-wrap text-sm text-black dark:text-[#ffffff] font-mono">
            {result}
          </pre>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-300 dark:border-yellow-700 rounded">
        <h3 className="font-bold mb-2 text-black dark:text-[#ffffff]">What to check:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-black dark:text-[#ffffff]">
          <li>Look at the TERMINAL/Console where you ran 'npm run dev'</li>
          <li>Look for messages with 📱 emoji</li>
          <li>Check your phone for an SMS</li>
          <li>Share the 📱 messages from the terminal with me</li>
        </ol>
      </div>
    </div>
  );
}

