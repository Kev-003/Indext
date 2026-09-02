use wasm_bindgen::prelude::*;

mod pipeline;
mod point;
mod simplify;
mod corner;
mod curves;
mod snapping;
mod output;

pub use pipeline::{refine_sketch, RefineOptions, RefineResultData};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn refine_sketch_js(
    flat_points: &[f64],
    stride: usize,
    opts: &JsValue,
) -> JsValue {
    console_error_panic_hook::set_once();

    let points: Vec<f64> = flat_points.to_vec();
    let options: RefineOptions = match serde_wasm_bindgen::from_value::<RefineOptions>(opts.into()) {
        Ok(o) => o,
        Err(e) => {
            log(&format!("Failed to parse options: {}", e));
            return JsValue::NULL;
        }
    };

    let result = refine_sketch(&points, stride, &options);
    serde_wasm_bindgen::to_value(&result)
        .unwrap_or_else(|e| {
            log(&format!("Failed to serialize result: {}", e));
            JsValue::NULL
        })
}

#[wasm_bindgen]
pub fn version() -> String {
    "0.1.0".to_string()
}
