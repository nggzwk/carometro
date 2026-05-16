BEGIN;

-- 1. SAFE ALL-VALUE MERGE: Remove os meses redundantes do item 738 onde o item 9 já possui dados históricos salvos
DELETE FROM inflacao_brasil.item_monthly_price duplicate
WHERE duplicate.item_id = 738
  AND EXISTS (
      SELECT 1 FROM inflacao_brasil.item_monthly_price master
      WHERE master.item_id = 9 AND master.month_ref = duplicate.month_ref
  );

-- 2. Migra todos os preços históricos restantes do item 738 para o item 9
UPDATE inflacao_brasil.item_monthly_price
SET item_id = 9
WHERE item_id = 738;

-- 3. Redireciona qualquer composição de cesta que aponte para o ID duplicado (738) para o ID mestre (9)
UPDATE inflacao_brasil.basket_item
SET item_id = 9
WHERE item_id = 738;

-- 4. DELETA o item_key duplicado (738) PRIMEIRO.
-- Isso vai desocupar e liberar a combinação única (12, UNIDADES, 2, 20001) da tabela.
DELETE FROM inflacao_brasil.item_key
WHERE id = 738;

-- 5. AGORA é 100% seguro atualizar o item mestre 9 sem estourar a constraint 'uq_item_key'!
UPDATE inflacao_brasil.item_key
SET qtd_embalagem = '12',
    unidade_sigla = 'UNIDADES'
WHERE id = 9;

-- 6. Consolida as observações brutas de preço para o novo formato padronizado
UPDATE inflacao_brasil.price_observation
SET qtd_embalagem = '12',
    unidade_sigla = 'UNIDADES'
WHERE produto_subcategoria = 20001;

COMMIT;