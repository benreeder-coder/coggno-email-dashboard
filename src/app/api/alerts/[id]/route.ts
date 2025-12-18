import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { resolved } = await request.json();

        const alert = await prisma.alert.findUnique({
            where: { id },
        });

        if (!alert) {
            return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
        }

        const updatedAlert = await prisma.alert.update({
            where: { id },
            data: {
                resolvedAt: resolved ? new Date() : null,
            },
        });

        return NextResponse.json(updatedAlert);
    } catch (error) {
        console.error('Error updating alert:', error);
        return NextResponse.json(
            { error: 'Failed to update alert' },
            { status: 500 }
        );
    }
}
