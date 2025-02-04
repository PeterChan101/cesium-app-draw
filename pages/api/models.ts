import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const getFilesRecursively = (directory: string): string[] => {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? getFilesRecursively(fullPath)
      : fullPath.endsWith('.gltf')
      ? fullPath
      : [];
  });

  const publicDir = path.join(process.cwd(), 'public');  // Define the public folder path

  // Normalize and remove the 'public' folder part of the path, ensuring forward slashes
  return files.map((file) => 
    path.posix.normalize(file.replace(publicDir, '').replace(/^\/+/, ''))
  );
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const modelsDir = path.join(process.cwd(), 'public', 'models');
  const files = getFilesRecursively(modelsDir);
  res.status(200).json(files);
}
