export const config = { runtime: 'edge' };
import { runQuery, jsonResponse, errorResponse } from './_ch.js';

const SQL = `
SELECT
    apld.enterprise_id AS enterprise_id,
    any(apld.enterprise_name) AS Enterprise_Name,
    any(ed.customer_segment) AS Customer_Segment,
    SUM(apld.contracted_arr) AS Total_Contracted_ARR,
    any(apld.plan_name) AS Plan_Name
FROM aggregated_data.aggregated_product_line_details apld
LEFT JOIN eventila.enterprise_details ed ON apld.enterprise_id = ed.enterprise_id
LEFT JOIN eventila.enterprise_account ea ON apld.enterprise_id = ea.enterprise_id
WHERE apld.is_test_account = 0
  AND coalesce(ed.category, ea.category) IN ('Automobile', 'Automobiles', 'Cars')
  AND apld.enterprise_id NOT IN ('4bc9d1ce6','TaD1VC1Ko','93e1a2855','39b5a5268','28733e36c','197d146c4','af5e033aa','2LA80M7WO','1ff0e3f32','PV3J5E8H9')
GROUP BY apld.enterprise_id
ORDER BY Total_Contracted_ARR DESC
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
