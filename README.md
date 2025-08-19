# Bilingual Text-to-CAD Model Generation (English-Vietnamese)

This project provides a pipeline and web application for generating 3D CAD models from bilingual (English and Vietnamese) text descriptions. It includes:

- Data processing and reasoning notebooks for preparing and evaluating datasets.
- CAD files and sample outputs for benchmarking and testing.
- A quantization module for model optimization.
- A web application (frontend and backend) for user interaction and model serving.

## Main Features
- Support for both English and Vietnamese text inputs.
- Automated evaluation and metrics for generated CAD models.
- Modular design for easy extension and integration.

## Structure
- `notebooks/`: Data processing, evaluation, and metrics notebooks.
- `quantize/`: Scripts for model quantization and conversion.
- `webapp/`: Full-stack web application (Next.js frontend, Python backend).
- `output/`, `temp/`, `models/`: Results, temporary files, and model storage.

## Usage
1. Prepare your data and models using the notebooks and scripts.
2. Run the web application for interactive text-to-CAD generation.
3. Evaluate results and metrics using provided tools.
