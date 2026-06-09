export const config = { runtime: 'edge' };
import { runQuery, jsonResponse, errorResponse } from './_ch.js';

const SQL = `
WITH
enterprise_info AS (
    SELECT ed.enterprise_id, coalesce(ed.category, ea.category) AS category, ed.customer_segment
    FROM eventila.enterprise_details ed
    LEFT JOIN eventila.enterprise_account ea ON ed.enterprise_id = ea.enterprise_id
    WHERE ed.stage IN ('Live', 'Onboarding')
      AND coalesce(ed.category, ea.category) IN ('Automobile', 'Automobiles', 'Cars')
),
sku_counts AS (
    SELECT s.team_id, s.enterprise_id, count() AS Total_SKUs
    FROM eventila.ai_sku s
    INNER JOIN enterprise_info ei ON s.enterprise_id = ei.enterprise_id
    WHERE toDate(s.created_on) >= toStartOfMonth(addMonths(today(), -3))
      AND s.is_hidden = 0 AND s.status = 'Done' AND s.crm_status = 'qc_done'
      AND s.enterprise_id NOT IN ('4bc9d1ce6','TaD1VC1Ko','93e1a2855','39b5a5268','28733e36c','197d146c4','af5e033aa','2LA80M7WO','1ff0e3f32','PV3J5E8H9')
    GROUP BY s.team_id, s.enterprise_id
),
arr_data AS (
    SELECT team_id, any(team_name) AS team_name, any(enterprise_name) AS enterprise_name, SUM(contracted_arr) AS Total_Contracted_ARR
    FROM aggregated_data.aggregated_product_line_details
    WHERE is_test_account = 0
    GROUP BY team_id
)
SELECT
    sc.team_id,
    any(ad.team_name) AS Team_Name,
    any(ad.enterprise_name) AS Enterprise_Name,
    any(ei.customer_segment) AS Customer_Segment,
    any(sc.Total_SKUs) AS Total_SKUs,
    any(coalesce(ad.Total_Contracted_ARR, 0)) AS Total_Contracted_ARR
FROM sku_counts sc
LEFT JOIN enterprise_info ei ON sc.enterprise_id = ei.enterprise_id
LEFT JOIN arr_data ad ON sc.team_id = ad.team_id
GROUP BY sc.team_id
ORDER BY Total_SKUs DESC
LIMIT 10
`;

export default async function handler(req) {
  try {
    const data = await runQuery(SQL);
    return jsonResponse(data);
  } catch (err) {
    return errorResponse(err);
  }
}
