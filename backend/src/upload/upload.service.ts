import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadService {
  private readonly uploadPath = join(process.cwd(), 'uploads', 'receipts');

  constructor() {
    // Criar diretório de uploads se não existir
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File, userId: string): Promise<string> {
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.originalname.split('.').pop();
    const filename = `${userId}_${timestamp}_${randomString}.${extension}`;
    
    const filepath = join(this.uploadPath, filename);
    
    // Salvar arquivo
    fs.writeFileSync(filepath, file.buffer);
    
    // Retornar URL relativa (será servida estaticamente)
    return `/uploads/receipts/${filename}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;
    
    const filename = fileUrl.split('/').pop();
    const filepath = join(this.uploadPath, filename);
    
    if (existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }
}

