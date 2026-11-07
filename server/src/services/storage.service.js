import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import env from '../config/env.js';
import logger from '../utils/logger.js';

if (env.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

const LOCAL_DIR = path.resolve(process.cwd(), 'public/uploads');

/**
 * Storage abstraction. Cloudinary is the production provider; a local disk
 * fallback keeps development usable without credentials. Binary data is never
 * written to MongoDB — only URLs + publicIds are persisted.
 */
export const storage = {
  get provider() {
    return env.cloudinary.enabled ? 'cloudinary' : 'local';
  },

  async upload(buffer, { folder = 'products', filename } = {}) {
    if (env.cloudinary.enabled) {
      const res = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `${env.cloudinary.folder}/${folder}`,
            resource_type: 'image',
            transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
          },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(buffer);
      });
      return {
        url: res.secure_url,
        publicId: res.public_id,
        width: res.width,
        height: res.height,
        provider: 'cloudinary',
      };
    }

    if (!env.allowLocalUploads) {
      throw new Error('Image storage is not configured. Set Cloudinary credentials.');
    }
    const dir = path.join(LOCAL_DIR, folder);
    await fs.mkdir(dir, { recursive: true });
    const ext = (filename && path.extname(filename)) || '.jpg';
    const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    await fs.writeFile(path.join(dir, name), buffer);
    logger.warn('Cloudinary not configured — stored image locally at', `/uploads/${folder}/${name}`);
    return { url: `/uploads/${folder}/${name}`, publicId: `local:${folder}/${name}`, provider: 'local' };
  },

  async uploadMany(files = [], opts = {}) {
    return Promise.all(files.map((f) => this.upload(f.buffer, { ...opts, filename: f.originalname })));
  },

  async destroy(publicId) {
    if (!publicId) return;
    if (publicId.startsWith('local:')) {
      const rel = publicId.replace('local:', '');
      try {
        await fs.unlink(path.join(LOCAL_DIR, rel));
      } catch {
        /* already gone */
      }
      return;
    }
    if (!env.cloudinary.enabled) return;
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      logger.warn('Cloudinary destroy failed:', err.message);
    }
  },

  /** Optimised delivery URL with responsive transforms (Cloudinary only). */
  transform(url, { width = 800, height, crop = 'fill' } = {}) {
    if (!url || !url.includes('res.cloudinary.com')) return url;
    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;
    const t = ['f_auto', 'q_auto', `w_${width}`, `c_${crop}`, ...(height ? [`h_${height}`] : [])].join(',');
    return `${parts[0]}/upload/${t}/${parts[1]}`;
  },
};

export default storage;
