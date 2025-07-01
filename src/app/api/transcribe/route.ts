// Author: Kushal Sharma
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';

export async function POST(request: Request) {
  try {
    const { transcript } = await request.json();
    if (typeof transcript !== 'string') {
      return NextResponse.json({ success: false, message: 'Invalid transcript provided.' }, { status: 400 });
    }

    const savePath = process.env.TRANSCRIPTION_SAVE_PATH;
    if (!savePath) {
      console.error('TRANSCRIPTION_SAVE_PATH is not set in .env file.');
      return NextResponse.json({ success: false, message: 'Server configuration error: Save path not set.' }, { status: 500 });
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `write-${timestamp}.txt`;
    
    // Ensure the path is resolved relative to the project root
    const fullDirectoryPath = path.join(process.cwd(), savePath);
    const fullFilePath = path.join(fullDirectoryPath, filename);

    await fs.mkdir(fullDirectoryPath, { recursive: true });
    await fs.writeFile(fullFilePath, transcript, 'utf-8');

    return NextResponse.json({ success: true, message: `Transcript saved to ${path.join(savePath, filename)}` });
  } catch (error) {
    console.error('Failed to save transcript:', error);
    return NextResponse.json({ success: false, message: 'Failed to save transcript.' }, { status: 500 });
  }
}
