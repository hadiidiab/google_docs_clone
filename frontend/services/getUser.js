import { cookies } from "next/headers";

const getUser = async () => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/user`,
      {
        method: "GET",
        headers: { Cookie: cookies().toString() },
      }
    );
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export default getUser;
