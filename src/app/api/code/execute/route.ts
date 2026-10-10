import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { source_code, language_id } = await req.json();

    const url = process.env.CODE_EXECUTION_API_URL;
    const key = process.env.CODE_EXECUTION_API_KEY;

    if (!url) {
      return NextResponse.json(
        { error: 'Code execution service is currently unavailable (Not configured). Evaluation will rely on logic analysis.' },
        { status: 503 }
      );
    }

    // Assuming a Judge0 compatible API
    const response = await fetch(`${url}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': key || '',
      },
      body: JSON.stringify({
        source_code,
        language_id, // 71 for Python, 63 for JS, etc
      }),
    });

    if (!response.ok) {
      throw new Error(`Execution API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({
      stdout: data.stdout,
      stderr: data.stderr,
      compile_output: data.compile_output,
      status: data.status?.description,
    });
  } catch (error: any) {
    console.error('Error executing code:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
