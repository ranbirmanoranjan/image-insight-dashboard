export const config = { runtime: 'edge' };
import { runQuery, jsonResponse, errorResponse } from './_ch.js';

const SQL = `
SELECT
    first_month AS Month,
    customer_segment,
    countDistinct(enterprise_id) AS New_Enterprises_Added,
    countDistinct(team_id) AS New_Rooftops_Added
FROM (
    SELECT
        t1.enterprise_id AS enterprise_id,
        t1.team_id AS team_id,
        ei.customer_segment AS customer_segment,
        min(date_trunc('month', t2.firstQCTime)) AS first_month
    FROM eventila.ai_sku t1
    INNER JOIN (
        SELECT sku_id, min(created_on) AS firstQCTime
        FROM eventila.sku_activity_log
        WHERE toDate(created_on) >= toStartOfMonth(addMonths(today(), -6))
          AND updated_status = 'qc_done' AND qc_user_id != ''
        GROUP BY sku_id
    ) t2 ON t1.sku_id = t2.sku_id
    LEFT JOIN (
        SELECT ed.enterprise_id AS enterprise_id, ed.customer_segment AS customer_segment
        FROM eventila.enterprise_details ed
        LEFT JOIN eventila.enterprise_account ea ON ed.enterprise_id = ea.enterprise_id
        WHERE ed.stage IN ('Live', 'Onboarding')
          AND coalesce(ed.category, ea.category) IN ('Automobile', 'Automobiles', 'Cars')
    ) ei ON t1.enterprise_id = ei.enterprise_id
    WHERE toDate(t1.created_on) >= toStartOfMonth(addMonths(today(), -3))
      AND t1.is_hidden = 0 AND t1.status = 'Done' AND t1.crm_status = 'qc_done'
      AND t1.enterprise_id NOT IN ('4bc9d1ce6','TaD1VC1Ko','93e1a2855','39b5a5268','28733e36c','197d146c4','af5e033aa','2LA80M7WO','1ff0e3f32','PV3J5E8H9')
    GROUP BY t1.enterprise_id, t1.team_id, ei.customer_segment
) sub
GROUP BY first_month, customer_segment
ORDER BY first_month DESC, customer_segment
`;

export default async function handler(req) {
  try {
    const data = await runQuery(SQL);
    return jsonResponse(data);
  } catch (err) {
    return errorResponse(err);
  }
}
