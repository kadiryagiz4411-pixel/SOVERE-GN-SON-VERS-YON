select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'agency_knowledge_base'
order by ordinal_position;
