
import { NextResponse } from 'next/server';

const EXTERNAL_CATEGORY_API_URL = "https://gotickets-server.payshia.com/categories";

export async function GET() {
  try {
    const response = await fetch(EXTERNAL_CATEGORY_API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add any other headers the external API might require, e.g., API keys
      },
      // If the external API is on a different domain and requires credentials (cookies, auth headers)
      // and supports CORS with credentials, you might need:
      // credentials: 'include', // But be cautious with this
    });

    if (!response.ok) {
      // Log the error and forward a non-200 status from the external API if appropriate
      const errorText = await response.text();
      console.error(`External API Error fetching categories: ${response.status} - ${errorText}`);
      return NextResponse.json({ message: `Failed to fetch categories from external source: ${response.status}` }, { status: response.status });
    }

    const categories = await response.json();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error proxying categories request:', error);
    // This typically means a network error on the server's side trying to reach the external API
    // or an issue with the fetch call itself.
    return NextResponse.json({ message: 'Internal server error while fetching categories' }, { status: 500 });
  }
}
