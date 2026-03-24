// src/app/api/v1/templates/route.ts

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { checkFeatureAccess } from '@/lib/billing';

/**
 * GET /api/v1/templates — list user's prompt templates
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const templates = await db.promptTemplate.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ templates });
}

/**
 * POST /api/v1/templates — create a new prompt template
 */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasAccess = await checkFeatureAccess(user.id, 'hasCustomPrompts');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Custom prompts require Pro or Business plan' }, { status: 403 });
  }

  const { name, outputType, promptText, description } = await req.json();

  if (!name?.trim() || !promptText?.trim()) {
    return NextResponse.json({ error: 'Name and prompt text are required' }, { status: 400 });
  }

  const template = await db.promptTemplate.create({
    data: {
      userId: user.id,
      name: name.trim(),
      outputType: outputType || 'CUSTOM',
      promptText: promptText.trim(),
      description: description?.trim() || null,
    },
  });

  return NextResponse.json({ template }, { status: 201 });
}
