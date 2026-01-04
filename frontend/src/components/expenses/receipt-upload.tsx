'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Label } from '@/components/ui/label';

interface ReceiptUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  disabled?: boolean;
}

export function ReceiptUpload({ value, onChange, disabled }: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Atualizar preview quando value mudar
  useEffect(() => {
    if (value) {
      setPreview(null); // Limpar preview local quando há value (vem do servidor)
    }
  }, [value]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Erro',
        description: 'Tipo de arquivo não permitido. Use JPG, PNG ou WEBP.',
        variant: 'destructive',
      });
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'Arquivo muito grande. Tamanho máximo: 5MB.',
        variant: 'destructive',
      });
      return;
    }

    // Criar preview imediatamente
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload/receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onChange(response.data.url);
      toast({
        title: 'Sucesso',
        description: 'Comprovante enviado com sucesso!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao enviar comprovante',
        variant: 'destructive',
      });
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const imageUrl = value ? `${apiUrl}${value}` : null;

  return (
    <div className="space-y-2">
      <Label htmlFor="receipt-upload">Comprovante (Opcional)</Label>
      
      {(preview || imageUrl) ? (
        <div className="relative border rounded-lg p-3 sm:p-4 bg-muted/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden border flex-shrink-0">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt="Comprovante"
                  fill
                  className="object-cover"
                />
              ) : preview ? (
                <Image
                  src={preview}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Comprovante anexado</p>
              <p className="text-xs text-muted-foreground">
                {value ? 'Clique para trocar' : 'Preview'}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClick}
              disabled={disabled || uploading}
              className="flex-shrink-0"
              title="Trocar comprovante"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="flex-shrink-0"
              title="Remover comprovante"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          className={`
            border-2 border-dashed rounded-lg p-4 sm:p-6 text-center cursor-pointer
            transition-colors
            ${disabled || uploading
              ? 'opacity-50 cursor-not-allowed bg-muted'
              : 'hover:border-primary hover:bg-accent/50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || uploading}
          />
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Enviando...</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Clique para fazer upload</p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG ou WEBP (máx. 5MB)
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

