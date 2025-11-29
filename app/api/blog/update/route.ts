import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const blogDirectory = path.join(process.cwd(), 'content/blog');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const slug = formData.get('slug') as string;

    if (!file || !file.name.endsWith('.md')) {
      return NextResponse.json(
        { error: 'Only .md files are allowed' },
        { status: 400 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    if (!fs.existsSync(blogDirectory)) {
      fs.mkdirSync(blogDirectory, { recursive: true });
    }

    const filePath = path.join(blogDirectory, `${slug}.md`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    const content = await file.text();
    fs.writeFileSync(filePath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Blog post updated successfully',
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    );
  }
}

