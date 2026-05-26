import { NextRequest, NextResponse } from 'next/server';
import { readAllCategories, deleteEntry, addEntry, updateEntry } from '@/lib/knowledge-base';
import { KnowledgeCategory } from '@/lib/types';

/** 获取所有知识库数据 */
export async function GET() {
  try {
    const knowledge = readAllCategories();
    return NextResponse.json(knowledge);
  } catch {
    return NextResponse.json({});
  }
}

/** 删除知识条目 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { entryId, category } = body;

    if (!entryId || !category) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const success = deleteEntry(entryId, category);
    return NextResponse.json({ success });
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}

/** 添加知识条目 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, content, keywords, confidence } = body;

    if (!category || !content) {
      return NextResponse.json({ error: '缺少分类或内容' }, { status: 400 });
    }

    const entry = addEntry(category as KnowledgeCategory, {
      category: category as KnowledgeCategory,
      content,
      keywords: keywords || [],
      confidence: confidence || 0.5,
      source: 'manual',
    });

    return NextResponse.json({ success: true, entry });
  } catch {
    return NextResponse.json({ error: '添加失败' }, { status: 500 });
  }
}

/** 更新知识条目 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { entryId, category, content, keywords, confidence } = body;

    if (!entryId || !category) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const success = updateEntry(entryId, category as KnowledgeCategory, {
      content,
      keywords,
      confidence,
    });

    return NextResponse.json({ success });
  } catch {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
