-- Backfill `home_node_id` for existing team-member JSON rows.
-- Keeps existing member fields and defaults missing owner node to `embedded-local`.

UPDATE agent_team_definitions
SET nodes = (
  SELECT
    CASE
      WHEN COUNT(*) = 0 THEN '[]'
      ELSE json_group_array(
        json_object(
          'member_name', COALESCE(json_extract(value, '$.member_name'), json_extract(value, '$.memberName')),
          'reference_id', COALESCE(json_extract(value, '$.reference_id'), json_extract(value, '$.referenceId')),
          'reference_type', COALESCE(json_extract(value, '$.reference_type'), json_extract(value, '$.referenceType')),
          'home_node_id', COALESCE(
            NULLIF(TRIM(COALESCE(json_extract(value, '$.home_node_id'), json_extract(value, '$.homeNodeId'))), ''),
            'embedded-local'
          ),
          'required_node_id', COALESCE(json_extract(value, '$.required_node_id'), json_extract(value, '$.requiredNodeId')),
          'preferred_node_id', COALESCE(json_extract(value, '$.preferred_node_id'), json_extract(value, '$.preferredNodeId'))
        )
      )
    END
  FROM json_each(agent_team_definitions.nodes)
)
WHERE json_valid(nodes) = 1
  AND json_type(nodes) = 'array'
  AND EXISTS (
    SELECT 1
    FROM json_each(agent_team_definitions.nodes)
    WHERE COALESCE(
      NULLIF(TRIM(COALESCE(json_extract(value, '$.home_node_id'), json_extract(value, '$.homeNodeId'))), ''),
      ''
    ) = ''
  );
