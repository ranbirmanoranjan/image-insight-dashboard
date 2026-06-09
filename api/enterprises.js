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
image_counts AS (
    SELECT im.enterprise_id, count() AS Total_Images
    FROM eventila.ai_image im
    INNER JOIN enterprise_info ei ON im.enterprise_id = ei.enterprise_id
    WHERE toDate(im.created_on) >= toStartOfMonth(addMonths(today(), -3))
      AND im.is_hidden = 0 AND im.status = 'Done' AND im.crm_status = 'qc_done'
    GROUP BY im.enterprise_id
),
sku_counts AS (
    SELECT enterprise_id, count() AS Total_SKUs
    FROM eventila.ai_sku
    WHERE toDate(created_on) >= toStartOfMonth(addMonths(today(), -3))
      AND is_hidden = 0 AND status = 'Done' AND crm_status = 'qc_done'
    GROUP BY enterprise_id
),
arr_data AS (
    SELECT enterprise_id, any(enterprise_name) AS enterprise_name, SUM(contracted_arr) AS Total_Contracted_ARR
    FROM aggregated_data.aggregated_product_line_details
    WHERE is_test_account = 0
    GROUP BY enterprise_id
)
SELECT
    ic.enterprise_id,
    any(ad.enterprise_name) AS Enterprise_Name,
    any(ei.customer_segment) AS Customer_Segment,
    any(ic.Total_Images) AS Total_Images,
    any(coalesce(sc.Total_SKUs, 0)) AS Total_SKUs,
    any(coalesce(ad.Total_Contracted_ARR, 0)) AS Total_Contracted_ARR
FROM image_counts ic
LEFT JOIN enterprise_info ei ON ic.enterprise_id = ei.enterprise_id
LEFT JOIN sku_counts sc ON ic.enterprise_id = sc.enterprise_id
LEFT JOIN arr_data ad ON ic.enterprise_id = ad.enterprise_id
WHERE ic.enterprise_id NOT IN ('4bc9d1ce6','TaD1VC1Ko','93e1a2855','39b5a5268','28733e36c','197d146c4','af5e033aa','2LA80M7WO','1ff0e3f32','PV3J5E8H9')
GROUP BY ic.enterprise_id
ORDER BY Total_Images DESC
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
