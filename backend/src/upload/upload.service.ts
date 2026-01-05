import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadService {
  private readonly receiptsPath = join(process.cwd(), 'uploads', 'receipts');
  private readonly goalsPath = join(process.cwd(), 'uploads', 'goals');

  constructor() {
    // Criar diretórios de uploads se não existirem
    if (!existsSync(this.receiptsPath)) {
      mkdirSync(this.receiptsPath, { recursive: true });
    }
    if (!existsSync(this.goalsPath)) {
      mkdirSync(this.goalsPath, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File, userId: string, type: 'receipt' | 'goal' = 'receipt'): Promise<string> {
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.originalname.split('.').pop();
    const filename = `${userId}_${timestamp}_${randomString}.${extension}`;
    
    const uploadPath = type === 'goal' ? this.goalsPath : this.receiptsPath;
    const filepath = join(uploadPath, filename);
    
    // Salvar arquivo
    fs.writeFileSync(filepath, file.buffer);
    
    // Retornar URL relativa (será servida estaticamente)
    return type === 'goal' ? `/uploads/goals/${filename}` : `/uploads/receipts/${filename}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;
    
    const filename = fileUrl.split('/').pop();
    // Determinar o tipo baseado na URL
    const isGoal = fileUrl.includes('/uploads/goals/');
    const uploadPath = isGoal ? this.goalsPath : this.receiptsPath;
    const filepath = join(uploadPath, filename);
    
    if (existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }
}


