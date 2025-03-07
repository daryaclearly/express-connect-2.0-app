import { Prisma, User } from '@prisma/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is not set');
}

// type that includes the user and the associated host
export type UserWithHost = User & { host: { id: string; companyName: string } };

export const fetchHostTeamMembersByHostId = async (hostId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/hosts/${hostId}/users`);
    if (response.ok) {
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data.users;
    } else {
      console.error('Failed to fetch users');
    }
  } catch (error) {
    console.error('Error fetching users:', error);
  }
};

export const changeHostAdmin = async (hostId: string, newAdminId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/hosts/${hostId}/change-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newAdminId }),
    });

    if (response.ok) {
      const result = await response.json();
      return result;
    } else {
      console.error('Failed to change admin', response.statusText);
      throw new Error('A problem occurred when trying to change admin.');
    }
  } catch (error) {
    throw new Error((error as Error)?.message);
  }
};

export const fetchHostById = async (hostId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/hosts/${hostId}`);
    if (response.ok) {
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } else {
      console.error('Failed to fetch host');
    }
  } catch (error) {
    console.error('Error fetching host', error);
    throw error;
  }
};

export const upsertHostUser = async (user: Prisma.UserCreateInput, hostId: string) => {
  try {
    const isEdit = !!user.id;

    // Copy user object and add hostId
    const userData = { ...user, hostId } as any;

    const response = await fetch(`${API_BASE_URL}/api/hosts/${hostId}/users`, {
      method: isEdit ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...userData, role: 'HOST_TEAM_MEMBER' }),
    });

    if (response.ok) {
      const data = await response.json();
      return true;
    } else {
      console.error('Failed to add user', response.statusText);
      throw new Error(
        'A problem occurred when trying to add to host.\nPlease make sure the email is not already in the system.'
      );
    }
  } catch (error) {
    throw new Error((error as Error)?.message);
  }
};

export const deleteHostUser = async (userId: string, hostId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/hosts/${hostId}/users`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (response.ok) {
      return true;
    } else {
      console.error('Failed to delete user', response.statusText);
      throw new Error('A problem occurred when trying to delete user from host.');
    }
  } catch (error) {
    throw new Error((error as Error)?.message);
  }
};
