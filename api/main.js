import { runQuery, jsonResponse, errorResponse } from './_ch.js';

const SQL = `
WITH
enterprise_info AS (
    SELECT ed.enterprise_id, coalesce(ed.category, ea.category) AS category, ed.customer_segment
    FROM eventila.enterprise_details ed
    LEFT JOIN eventila.enterprise_account ea ON ed.enterprise_id = ea.enterprise_id
    WHERE ed.stage IN ('Live', 'Onboarding')
),
first_qc_done_image AS (
    SELECT image_id, min(created_on) AS firstQCTime
    FROM eventila.image_activity_log
    WHERE toDate(created_on) >= toStartOfMonth(addMonths(today(), -3))
      AND updated_status = 'qc_done' AND qc_user_id != ''
    GROUP BY image_id
),
image_with_tat AS (
    SELECT t1.enterprise_id,
        dateDiff('second', t1.created_on, t2.firstQCTime) / 3600.0 AS tat_hours,
        date_trunc('month', t1.created_on) AS Month
    FROM eventila.ai_image t1
    INNER JOIN first_qc_done_image t2 ON t1.image_id = t2.image_id
    WHERE toDate(t1.created_on) >= toStartOfMonth(addMonths(today(), -3))
      AND t1.is_hidden = 0 AND t1.status = 'Done' AND t1.crm_status = 'qc_done'
),
first_qc_done_sku AS (
    SELECT sku_id, min(created_on) AS firstQCTime
    FROM eventila.sku_activity_log
    WHERE toDate(created_on) >= toStartOfMonth(addMonths(today(), -6))
      AND updated_status = 'qc_done' AND qc_user_id != ''
    GROUP BY sku_id
),
sku_with_tat AS (
    SELECT t1.enterprise_id, t1.team_id,
        dateDiff('second', t1.created_on, t2.firstQCTime) / 3600.0 AS tat_hours,
        date_trunc('month', t1.created_on) AS Month
    FROM eventila.ai_sku t1
    INNER JOIN first_qc_done_sku t2 ON t1.sku_id = t2.sku_id
    WHERE toDate(t1.created_on) >= toStartOfMonth(addMonths(today(), -3))
      AND t1.is_hidden = 0 AND t1.status = 'Done' AND t1.crm_status = 'qc_done'
),
image_final AS (
    SELECT s.Month, ei.customer_segment, ROUND(AVG(s.tat_hours), 2) AS Avg_Image_TAT_Hours
    FROM image_with_tat s
    LEFT JOIN enterprise_info ei ON s.enterprise_id = ei.enterprise_id
    WHERE ei.category IN ('Automobile', 'Automobiles', 'Cars')
      AND s.enterprise_id NOT IN ('4bc9d1ce6','TaD1VC1Ko','93e1a2855','39b5a5268','28733e36c','197d146c4','af5e033aa','2LA80M7WO','1ff0e3f32','PV3J5E8H9')
    GROUP BY s.Month, ei.customer_segment
),
sku_final AS (
    SELECT s.Month, ei.customer_segment,
        COUNT(*) AS Total_SKUs,
        ROUND(AVG(s.tat_hours), 2) AS Avg_SKU_TAT_Hours,
        COUNT(DISTINCT s.enterprise_id) AS Total_Enterprises,
        COUNT(DISTINCT s.team_id) AS Total_Teams
    FROM sku_with_tat s
    LEFT JOIN enterprise_info ei ON s.enterprise_id = ei.enterprise_id
    WHERE ei.category IN ('Automobile', 'Automobiles', 'Cars')
      AND s.enterprise_id NOT IN ('4bc9d1ce6','TaD1VC1Ko','93e1a2855','39b5a5268','28733e36c','197d146c4','af5e033aa','2LA80M7WO','1ff0e3f32','PV3J5E8H9')
    GROUP BY s.Month, ei.customer_segment
),
accuracy_final AS (
    SELECT toStartOfMonth(im.created_on) AS Month, ei.customer_segment,
        count(DISTINCT im.image_id) AS verified_images,
        count(DISTINCT IF(iim.image_id IS NOT NULL AND mei.image_id IS NULL, im.image_id, NULL)) AS qc_corrected_images,
        count(DISTINCT IF(mei.image_id IS NOT NULL, im.image_id, NULL)) AS manual_corrected_images
    FROM eventila.ai_image im
    LEFT JOIN enterprise_info ei ON im.enterprise_id = ei.enterprise_id
    INNER JOIN (
        SELECT DISTINCT image_id FROM eventila.image_activity_log
        WHERE created_on >= toStartOfMonth(addMonths(today(), -3))
          AND old_status = 'qc_inprogress' AND updated_status = 'qc_done'
    ) qc ON qc.image_id = im.image_id
    LEFT JOIN (
        SELECT DISTINCT image_id FROM eventila.image_reedit
        WHERE created_on >= toStartOfMonth(addMonths(today(), -3)) AND image_action = 'qc_editingtool'
    ) iim ON iim.image_id = im.image_id
    LEFT JOIN (
        SELECT DISTINCT image_id FROM eventila.image_reedit
        WHERE created_on >= toStartOfMonth(addMonths(today(), -3)) AND image_action = 're-edit'
    ) mei ON mei.image_id = im.image_id
    WHERE im.is_hidden = 0 AND im.status = 'Done' AND im.crm_status = 'qc_done'
      AND ei.category IN ('Automobile', 'Automobiles', 'Cars')
      AND im.enterprise_id NOT IN ('4bc9d1ce6','TaD1VC1Ko','93e1a2855','39b5a5268','28733e36c','197d146c4','af5e033aa','2LA80M7WO','1ff0e3f32','PV3J5E8H9')
    GROUP BY Month, ei.customer_segment
),
arr_monthly AS (
    SELECT ei.customer_segment, SUM(apld.contracted_arr) AS Total_Contracted_ARR
    FROM aggregated_data.aggregated_product_line_details apld
    LEFT JOIN enterprise_info ei ON apld.enterprise_id = ei.enterprise_id
    WHERE apld.is_test_account = 0
      AND ei.category IN ('Automobile', 'Automobiles', 'Cars')
      AND apld.enterprise_id NOT IN ('4bc9d1ce6','TaD1VC1Ko','93e1a2855','39b5a5268','28733e36c','197d146c4','af5e033aa','2LA80M7WO','1ff0e3f32','PV3J5E8H9')
    GROUP BY ei.customer_segment
)
SELECT
    coalesce(i.Month, s.Month, a.Month) AS Month,
    coalesce(i.customer_segment, s.customer_segment, a.customer_segment) AS customer_segment,
    a.verified_images AS Total_Images,
    i.Avg_Image_TAT_Hours,
    s.Total_SKUs, s.Avg_SKU_TAT_Hours,
    s.Total_Enterprises AS \`Total Active Enterprises\`,
    s.Total_Teams AS \`Total Active Rooftops\`,
    a.qc_corrected_images AS \`QC Fix Images\`,
    ROUND((a.qc_corrected_images / a.verified_images) * 100, 2) AS \`QC Fix %\`,
    a.manual_corrected_images AS \`Manual Fix\`,
    ROUND((a.manual_corrected_images / a.verified_images) * 100, 2) AS \`Manual Fix %\`,
    ROUND(((a.verified_images - a.qc_corrected_images - a.manual_corrected_images) / a.verified_images) * 100, 2) AS true_accuracy,
    ROUND(((a.verified_images - a.manual_corrected_images) / a.verified_images) * 100, 2) AS post_qc_tool_accuracy,
    coalesce(am.Total_Contracted_ARR, 0) AS Total_Contracted_ARR,
    IF(toStartOfMonth(coalesce(i.Month, s.Month, a.Month)) = toStartOfMonth(today()), 'MTD', 'Complete') AS Month_Type
FROM image_final i
FULL OUTER JOIN sku_final s ON i.Month = s.Month AND i.customer_segment = s.customer_segment
FULL OUTER JOIN accuracy_final a ON coalesce(i.Month, s.Month) = a.Month AND coalesce(i.customer_segment, s.customer_segment) = a.customer_segment
LEFT JOIN arr_monthly am ON coalesce(i.customer_segment, s.customer_segment, a.customer_segment) = am.customer_segment
ORDER BY Month DESC, customer_segment
`;

export default async function handler(req) {
  try {
    const data = await runQuery(SQL);
    return jsonResponse(data);
  } catch (err) {
    return errorResponse(err);
  }
}
