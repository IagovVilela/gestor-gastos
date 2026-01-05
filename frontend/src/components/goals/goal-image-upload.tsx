'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface GoalImageUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  disabled?: boolean;
}

export function GoalImageUpload({ value, onChange, disabled }: GoalImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Atualizar preview quando value mudar
  useEffect(() => {
    if (value) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      setPreview(`${apiUrl}${value}`);
    } else {
      setPreview(null);
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

      const response = await api.post('/upload/goal', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onChange(response.data.url);
      toast({
        title: 'Sucesso',
        description: 'Imagem enviada com sucesso!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao enviar imagem',
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

  return (
    <div className="space-y-2">
      <Label>Imagem da Meta</Label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {preview ? (
        <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-muted">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div
          onClick={handleClick}
          className={`
            w-full h-48 border-2 border-dashed rounded-lg
            flex flex-col items-center justify-center gap-2
            cursor-pointer transition-colors
            ${disabled || uploading
              ? 'opacity-50 cursor-not-allowed bg-muted'
              : 'hover:bg-muted/50 border-primary/50'
            }
          `}
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Enviando...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Clique para fazer upload da imagem
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG ou WEBP (máx. 5MB)
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}



