export function getCookie(name: string) : string | null {

	console.log('cookielo:', document.cookie);

    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    player_games: number;
    player_wins: number;
    created_at: string;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    // Fetch the current user's data
    const res = await fetch('/api/users/me', {
      credentials: 'include', // Include credentials in the request
    });

    if (!res.ok) {
      if (res.status === 401) {
        console.log("Unauthorized - removing stored token");
        localStorage.removeItem('token');
        return null;
      }
      throw new Error(`Failed to fetch profile: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error occurred:', err);
    return null;
  }
}
