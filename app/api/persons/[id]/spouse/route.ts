import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Retrieve spouse of a person
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: personId } = await params;

    // Find families where this person is either father or mother
    const families = await prisma.family.findMany({
      where: {
        OR: [
          { fatherId: personId },
          { motherId: personId }
        ]
      },
      include: {
        fatherPerson: true,
        motherPerson: true
      },
      orderBy: {
        createdAt: 'asc' // deterministic ordering
      }
    });

    let spousePerson = null;

    // Find the spouse by examining each family
    for (const family of families) {
      if (family.fatherId === personId && family.motherPerson) {
        spousePerson = family.motherPerson;
        break;
      }
      if (family.motherId === personId && family.fatherPerson) {
        spousePerson = family.fatherPerson;
        break;
      }
    }

    if (!spousePerson) {
      return NextResponse.json({ person: null });
    }

    // Return only necessary fields
    const response = {
      id: spousePerson.id,
      firstName: spousePerson.firstName,
      middleName: spousePerson.middleName || "",
      lastName: spousePerson.lastName,
      gender: spousePerson.gender,
      isDeceased: spousePerson.isDeceased
    };

    return NextResponse.json({ person: response });
  } catch (error) {
    console.error("Get spouse error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
