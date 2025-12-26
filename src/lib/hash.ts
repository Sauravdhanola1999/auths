import bcrypt from "bcryptjs";

export const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    return hash;
}


export const checkPassword = async (password: string, hash:string): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
}
