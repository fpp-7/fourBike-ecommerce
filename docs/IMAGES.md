# Imagens responsivas

As fotos canônicas dos modelos continuam em public/assets/models/, preservando PNGs de capa, fotos originais e URLs salvas pelo painel. A apresentação pública usa cópias WebP nas larguras 240, 480, 960 e 1440 quando a imagem de origem comporta esses tamanhos, sem ampliar a fonte.

As cópias ficam em public/assets/optimized/models/. O nome inclui uma impressão do arquivo original e das configurações do conversor. O manifesto public/js/data/photo-variants.js associa fontes conhecidas às cópias e é usado por public/js/domain/photo-sources.js. A imagem adequada é escolhida pelo navegador com srcset/sizes, conforme o espaço de capa, cartão, galeria, miniatura ou ampliação.

Se a cópia WebP em resolução original ficar maior que o JPEG de origem, essa resolução mantém o JPEG. As versões menores continuam disponíveis para evitar baixar uma imagem grande em uma miniatura.

Essa resolução acontece somente na apresentação: não altera os dados do catálogo, a ordem das fotos ou a escolha da foto principal. Fotos novas enviadas pelo painel e caminhos sem cópia conhecida usam o arquivo original como fallback. Otimização automática de futuros uploads não faz parte desta mudança.

## Regenerar cópias

O conversor é uma ferramenta de desenvolvimento e usa Python com Pillow. O servidor de produção continua sem essa dependência.

```sh
python -m pip install Pillow
python scripts/optimize-images.py
```

O script preserva os arquivos de origem, respeita orientação EXIF e gera WebP com qualidade 88. Inspecione as fotos, especialmente logotipos e detalhes do veículo, antes de publicar. Novas conversões não apagam cópias antigas automaticamente; remova variantes obsoletas apenas após verificar referências e cache.

As fotos iniciais são públicas. A otimização não altera a autorização das fotos enviadas pelo painel nem transforma uploads privados em arquivos estáticos.
