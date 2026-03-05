import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

interface Food {
  id: number;
  kind: string | null;
  name: string;
  location: string | null;
  distance: number | null;
  time: number | null;
  price: string | null;
  feet: number | null;
  star: string | null;
}

export async function GET(request: NextRequest) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'myhome',
  });

  try {
    const query = 'SELECT id, kind, name, location, distance, time, price, feet, star FROM food ORDER BY id DESC';
    const [rows] = await connection.execute(query);

    return NextResponse.json({
      success: true,
      data: rows as Food[],
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database query failed',
      },
      { status: 500 }
    );
  } finally {
    await connection.end();
  }
}
