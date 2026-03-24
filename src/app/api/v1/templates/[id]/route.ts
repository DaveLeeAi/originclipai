// src/app/api/v1/templates/[id]/route.ts

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';

/**
 * PATCH /api/v1/templates/:id — update a prompt template
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const template = await db.promptTemplate.findFirst({
    where: { id, userId: user.id },
  });

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const updated = await db.promptTemplate.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.outputType !== undefined && { outputType: body.outputType }),
      ...(body.promptText !== undefined && { promptText: body.promptText.trim() }),
      ...(body.description !== undefined && { description: body.description?.trim() || null }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  return NextResponse.json({ template: updated });
}

/**
 * DELETE /api/v1/templates/:id — delete a prompt template
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const template = await db.promptTemplate.findFirst({
    where: { id, userId: user.id },
  });

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  await db.promptTemplate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
