
import type { User, SignupFormData, BillingAddress, AdminUserFormData } from '@/lib/types';
import { USERS_API_URL, USER_LOGIN_API_URL, API_BASE_URL } from '@/lib/constants';
import { parseApiDateString, generateId } from './api.service';

const mockUsers: User[] = [
  { id: 'user-1', email: 'admin@example.com', password: "password123", name: 'Admin User', isAdmin: true, billingAddress: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'user-2', email: 'customer@example.com', password: "password123", name: 'Regular Customer', isAdmin: false, billingAddress: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

interface RawApiUser {
  id: string | number;
  email: string;
  password?: string;
  name?: string | null;
  isAdmin: string | number;
  createdAt?: string;
  updatedAt?: string;
  billing_street?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_postal_code?: string | null;
  billing_country?: string | null;
}

const mapApiUserToAppUser = (apiUser: RawApiUser): User => {
  let billingAddress: BillingAddress | null = null;
  if (
    apiUser.billing_street ||
    apiUser.billing_city ||
    apiUser.billing_state ||
    apiUser.billing_postal_code ||
    apiUser.billing_country
  ) {
    billingAddress = {
      street: apiUser.billing_street || "",
      city: apiUser.billing_city || "",
      state: apiUser.billing_state || "",
      postalCode: apiUser.billing_postal_code || "",
      country: apiUser.billing_country || "",
    };
  }

  return {
    id: String(apiUser.id),
    email: apiUser.email,
    password: apiUser.password,
    name: apiUser.name || null,
    isAdmin: String(apiUser.isAdmin) === "1" || Number(apiUser.isAdmin) === 1,
    billingAddress: billingAddress,
    createdAt: parseApiDateString(apiUser.createdAt),
    updatedAt: parseApiDateString(apiUser.updatedAt),
  };
};

export const loginUserWithApi = async (email: string, password_from_form: string): Promise<User> => {
  console.log(`[loginUserWithApi] Attempting login for email: ${email}`);
  try {
    const response = await fetch(USER_LOGIN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: password_from_form }),
    });

    let responseData: any = {};
    try {
      responseData = await response.json();
    } catch (jsonError) {
      console.warn(`[loginUserWithApi] Could not parse JSON response. Status: ${response.status}. Error:`, jsonError);
      if (response.status === 401) {
        throw new Error("Invalid email or password.");
      }
      if (!response.ok) {
         const errorText = await response.text().catch(() => "Could not read error response body.");
         throw new Error(`Login failed: ${response.status}. Server response: ${errorText.substring(0,150)}`);
      }
      throw new Error("Login response was not valid JSON.");
    }

    if (!response.ok) {
      let errorMessage = responseData.message;
      if (response.status === 401 && !errorMessage) {
        errorMessage = "Invalid email or password.";
      } else if (!errorMessage) {
        errorMessage = `Login failed: ${response.status}. Please try again.`;
      }
      
      if (errorMessage === "Invalid email or password." && responseData && Object.keys(responseData).length === 0) {
        console.error(`[loginUserWithApi] API Error: ${errorMessage}`);
      } else {
        console.error(`[loginUserWithApi] API Error: ${errorMessage}`, responseData);
      }
      throw new Error(errorMessage);
    }

    if (responseData.user) {
      console.log("[loginUserWithApi] Login successful. Raw user data:", responseData.user);
      const appUser = mapApiUserToAppUser(responseData.user as RawApiUser);
      console.log("[loginUserWithApi] Mapped app user:", appUser);
      return appUser;
    } else {
      console.error("[loginUserWithApi] Login response OK, but no user object in responseData.user. Response:", responseData);
      throw new Error("Login successful, but user data was not returned correctly by the API.");
    }
  } catch (error) {
    console.error("[loginUserWithApi] Network or other error during login:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred during login. Please check your connection and try again.");
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const normalizedQueryEmail = email.toLowerCase();
  if (API_BASE_URL && USERS_API_URL) {
    const fetchUrl = `${USERS_API_URL}?email=${encodeURIComponent(normalizedQueryEmail)}`;
    console.log(`[getUserByEmail] Fetching from: ${fetchUrl}`);
    try {
      const response = await fetch(fetchUrl);
      console.log(`[getUserByEmail] Response status for ${normalizedQueryEmail}: ${response.status}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[getUserByEmail] User ${normalizedQueryEmail} not found (404). Returning null.`);
          return null;
        }
        const errorText = await response.text();
        console.error(`[getUserByEmail] API Error fetching user by email ${normalizedQueryEmail}: Status ${response.status}, Body: ${errorText}`);
        return null;
      }

      const responseText = await response.text();
      console.log(`[getUserByEmail] Raw API response for ${normalizedQueryEmail}: ${responseText}`);
      
      let usersData: RawApiUser[] = [];
      try {
        usersData = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[getUserByEmail] Failed to parse JSON response for ${normalizedQueryEmail}:`, parseError, "Raw text was:", responseText);
        return null;
      }

      console.log(`[getUserByEmail] Parsed usersData for ${normalizedQueryEmail}:`, usersData);

      if (usersData && usersData.length > 0) {
        const foundUser = usersData.find(u => u.email.toLowerCase() === normalizedQueryEmail);
        if (foundUser) {
            console.log(`[getUserByEmail] User ${normalizedQueryEmail} found in API response. Returning user.`);
            return mapApiUserToAppUser(foundUser);
        } else {
            console.log(`[getUserByEmail] User ${normalizedQueryEmail} NOT strictly found in API response list (checked ${usersData.length} users). Returning null.`);
            return null;
        }
      }
      console.log(`[getUserByEmail] No user data or empty array for ${normalizedQueryEmail}. Returning null.`);
      return null;
    } catch (error) {
      console.error(`[getUserByEmail] Network error fetching user by email ${normalizedQueryEmail}:`, error);
      return null;
    }
  } else {
    console.warn("[getUserByEmail] API_BASE_URL or USERS_API_URL not set, using local mockUsers.");
    return mockUsers.find(user => user.email.toLowerCase() === normalizedQueryEmail) || null;
  }
};

export const getUserById = async (id: string): Promise<User | null> => {
  if (!USERS_API_URL) {
    console.error("USERS_API_URL is not configured.");
    return null;
  }
  try {
    const response = await fetch(`${USERS_API_URL}/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch user ${id}: ${response.status}`);
    }
    const apiUser: RawApiUser = await response.json();
    return mapApiUserToAppUser(apiUser);
  } catch (error) {
    console.error(`Error fetching user by ID ${id}:`, error);
    return null;
  }
};

export const createUser = async (data: SignupFormData): Promise<User> => {
  if (API_BASE_URL && USERS_API_URL) {
    console.log(`[createUser] Attempting to create user via API: ${USERS_API_URL} for email: ${data.email}`);
    const payload: Partial<RawApiUser> = {
      email: data.email.toLowerCase(),
      name: data.name,
      password: data.password,
      isAdmin: '0',
      billing_street: data.billing_street || undefined,
      billing_city: data.billing_city || undefined,
      billing_state: data.billing_state || undefined,
      billing_postal_code: data.billing_postal_code || undefined,
      billing_country: data.billing_country || undefined,
    };
    
    Object.keys(payload).forEach(key => {
      const K = key as keyof typeof payload;
      if (payload[K] === undefined || payload[K] === '') {
        delete payload[K];
      }
    });
    
    try {
      const response = await fetch(USERS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: `API error ${response.status} during user creation.` }));
        if (response.status === 409 || (errorBody.message && (errorBody.message.toLowerCase().includes('duplicate') || errorBody.message.toLowerCase().includes('already exists') || errorBody.message.toLowerCase().includes('already in use')))) {
            throw new Error("This email address is already in use on the server.");
        }
        throw new Error(errorBody.message || `API error creating user: ${response.status}`);
      }
      const newApiUser: RawApiUser = await response.json();
      return mapApiUserToAppUser(newApiUser);
    } catch (error) {
      console.error("[createUser] Error in API call:", error);
      throw error;
    }
  } else {
    console.warn("[createUser] API_BASE_URL or USERS_API_URL not set, using local mockUsers.");
    if (mockUsers.some(u => u.email === data.email.toLowerCase())) {
      throw new Error("User with this email already exists in mock store.");
    }
    const newUser: User = {
      id: generateId('user'),
      email: data.email.toLowerCase(),
      name: data.name,
      password: data.password,
      isAdmin: false,
      billingAddress: (data.billing_street || data.billing_city) ? {
          street: data.billing_street || "",
          city: data.billing_city || "",
          state: data.billing_state || "",
          postalCode: data.billing_postal_code || "",
          country: data.billing_country || "",
      } : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockUsers.push(newUser);
    return newUser;
  }
};

export const adminCreateUser = async (data: AdminUserFormData): Promise<User> => {
  if (!USERS_API_URL) {
    throw new Error("USERS_API_URL is not configured.");
  }
  
  if (!data.password) {
    throw new Error("Password is required for creating a new user.");
  }

  const payload = {
    email: data.email.toLowerCase(),
    name: data.name,
    password: data.password,
    isAdmin: data.isAdmin ? '1' : '0',
  };

  const response = await fetch(USERS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: `API error ${response.status} during user creation.` }));
    throw new Error(errorBody.message || `Failed to create user: ${response.status}`);
  }
  
  const newApiUser: RawApiUser = await response.json();
  return mapApiUserToAppUser(newApiUser);
};

export const updateUser = async (userId: string, dataToUpdate: Partial<User> & { password?: string }): Promise<User | null> => {
  if (API_BASE_URL && USERS_API_URL) {
    const apiPayload: Partial<RawApiUser & { password?: string }> = {};

    if (dataToUpdate.name !== undefined) apiPayload.name = dataToUpdate.name;
    if (dataToUpdate.email !== undefined) apiPayload.email = dataToUpdate.email;
    if (dataToUpdate.isAdmin !== undefined) apiPayload.isAdmin = dataToUpdate.isAdmin ? '1' : '0';
    if (dataToUpdate.password) apiPayload.password = dataToUpdate.password;
    
    if (dataToUpdate.billingAddress === null) {
        apiPayload.billing_street = null;
        apiPayload.billing_city = null;
        apiPayload.billing_state = null;
        apiPayload.billing_postal_code = null;
        apiPayload.billing_country = null;
    } else if (dataToUpdate.billingAddress) {
        apiPayload.billing_street = dataToUpdate.billingAddress.street;
        apiPayload.billing_city = dataToUpdate.billingAddress.city;
        apiPayload.billing_state = dataToUpdate.billingAddress.state;
        apiPayload.billing_postal_code = dataToUpdate.billingAddress.postalCode;
        apiPayload.billing_country = dataToUpdate.billingAddress.country;
    }

    try {
      const response = await fetch(`${USERS_API_URL}/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        const errorBody = await response.json().catch(() => ({ message: `Failed to update user ${userId} via API and parse error. Status: ${response.status}` }));
        
        let detailedErrorMessage = errorBody.message || `API error updating user ${userId}: ${response.status}`;
        if (errorBody.errors && typeof errorBody.errors === 'object' && !Array.isArray(errorBody.errors)) {
          const fieldErrors = Object.entries(errorBody.errors)
            .map(([field, messages]: [string, any]) => `${field}: ${(Array.isArray(messages) ? messages.join(', ') : String(messages))}`)
            .join('; ');
          if (fieldErrors) {
            detailedErrorMessage = `${detailedErrorMessage}. Details: ${fieldErrors}`;
          }
        } else if (Array.isArray(errorBody.errors)) {
            detailedErrorMessage = `${detailedErrorMessage}. Details: ${errorBody.errors.join('; ')}`;
        }
        throw new Error(detailedErrorMessage);
      }
      const updatedApiUser: RawApiUser = await response.json();
      return mapApiUserToAppUser(updatedApiUser);
    } catch (error) {
      console.error(`Network or other error updating user ${userId} via API:`, error);
      throw error;
    }

  } else {
    console.warn(`API_BASE_URL or USERS_API_URL not set, updateUser using local mockUsers for user ID: ${userId}.`);
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) return null;
    mockUsers[userIndex] = { ...mockUsers[userIndex], ...dataToUpdate, updatedAt: new Date().toISOString() };
    if (typeof localStorage !== 'undefined') {
      const storedUser = localStorage.getItem('mypassUser');
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        if (parsedUser.id === userId) {
          localStorage.setItem('mypassUser', JSON.stringify(mockUsers[userIndex]));
        }
      }
    }
    return mockUsers[userIndex];
  }
};

export const adminGetAllUsers = async (): Promise<User[]> => {
  if (!USERS_API_URL) {
    console.error("USERS_API_URL is not configured.");
    return [];
  }
  try {
    const response = await fetch(USERS_API_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }
    const apiUsers: RawApiUser[] = await response.json();
    return apiUsers.map(mapApiUserToAppUser).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  } catch (error) {
    console.error("Error in adminGetAllUsers:", error);
    return [];
  }
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  if (!USERS_API_URL) {
    throw new Error("USERS_API_URL is not configured.");
  }
  const url = `${USERS_API_URL}/${userId}`;
  try {
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Failed to delete user and parse error response.' }));
      throw new Error(errorBody.message || `Failed to delete user ${userId}: ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
};
