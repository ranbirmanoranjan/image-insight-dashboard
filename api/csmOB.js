export const config = { runtime: 'edge' };
import { runQuery, jsonResponse, errorResponse } from './_ch.js';

const SQL = `
SELECT
    coalesce(apld.cs_poc_email, apld.ob_poc_email) AS Owner,
    CASE WHEN apld.cs_poc_email != '' AND apld.cs_poc_email IS NOT NULL THEN 'CSM' ELSE 'OB' END AS Owner_Type,
    count(DISTINCT apld.enterprise_id) AS Total_Enterprises,
    sum(apld.contracted_arr) AS Total_Contracted_ARR,
    any(ed.customer_segment) AS Customer_Segment
FROM aggregated_data.aggregated_product_line_details apld
LEFT JOIN eventila.enterprise_details ed ON apld.enterprise_id = ed.enterprise_id
LEFT JOIN eventila.enterprise_account ea ON apld.enterprise_id = ea.enterprise_id
WHERE apld.is_test_account = 0
  AND coalesce(ed.category, ea.category) IN ('Automobile', 'Automobiles', 'Cars')
  AND apld.enterprise_id NOT IN ('4bc9d1ce6','TaD1VC1Ko','93e1a2855','39b5a5268','28733e36c','197d146c4','af5e033aa','2LA80M7WO','1ff0e3f32','PV3J5E8H9')
  AND coalesce(apld.cs_poc_email, apld.ob_poc_email) != ''
  AND coalesce(apld.cs_poc_email, apld.ob_poc_email) IS NOT NULL
GROUP BY Owner, Owner_Type
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
