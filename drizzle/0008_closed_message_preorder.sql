-- A closed store now takes pre-orders: drop the saved message only if it is still the old default
-- ("can't take new orders"), so the new default shows. Texts the owner wrote are kept.
DELETE FROM "settings" WHERE "key" = 'store.closedMessage'
  AND "value"->>'id' = 'Kami lagi istirahat, jadi belum bisa menerima pesanan baru. Cek lagi nanti ya!';
