import torch
from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments
from unsloth import is_bfloat16_supported

# ==========================================
# ⚙️ CONFIGURATION
# ==========================================
MODEL_NAME = "unsloth/Qwen/Qwen2.5-Coder-7B-Instruct"
DATASET_PATH = "./logs/training_dataset.jsonl" # Path to your generated data
OUTPUT_DIR = "qwen_reel_finetune"
MAX_SEQ_LENGTH = 8192 # L4 can handle this easily with Unsloth
DTYPE = None # Auto-detect (Float16 or Bfloat16)
LOAD_IN_4BIT = True # REQUIRED for 24GB VRAM with large context

# ==========================================
# 1. LOAD MODEL
# ==========================================
print(f"⬇️ Loading Model: {MODEL_NAME}...")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=DTYPE,
    load_in_4bit=LOAD_IN_4BIT,
)

# ==========================================
# 2. CONFIGURE LoRA (The "Brain Surgery")
# ==========================================
print("🔧 Applying LoRA Adapters...")
model = FastLanguageModel.get_peft_model(
    model,
    r=16, # Rank (Higher = smarter but slower. 16 is standard)
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth", # Saves VRAM
    random_state=3407,
)

# ==========================================
# 3. PREPARE DATASET
# ==========================================
print(f"📚 Loading Dataset from {DATASET_PATH}...")

# Alpaca Prompt Template (Matches Qwen Instruct style roughly)
alpaca_prompt = """Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.

### Instruction:
{}

### Input:
{}

### Response:
{}"""

EOS_TOKEN = tokenizer.eos_token

def formatting_prompts_func(examples):
    instructions = examples["instruction"]
    inputs = examples["input"]
    outputs = examples["output"]
    texts = []
    for instruction, input, output in zip(instructions, inputs, outputs):
        text = alpaca_prompt.format(instruction, input, output) + EOS_TOKEN
        texts.append(text)
    return {"text": texts}

dataset = load_dataset("json", data_files=DATASET_PATH, split="train")
dataset = dataset.map(formatting_prompts_func, batched=True)

print(f"✅ Loaded {len(dataset)} training examples.")

# ==========================================
# 4. TRAIN
# ==========================================
print("🚀 Starting Training...")

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LENGTH,
    dataset_num_proc=2,
    packing=False, # Can speed up training but can be buggy on small datasets
    args=TrainingArguments(
        per_device_train_batch_size=2, # Conservative for 24GB
        gradient_accumulation_steps=4, # Effective batch size = 8
        warmup_steps=5,
        max_steps=60, # SHORT RUN for testing! Increase to 500+ for real training
        learning_rate=2e-4,
        fp16=not is_bfloat16_supported(),
        bf16=is_bfloat16_supported(),
        logging_steps=1,
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="linear",
        seed=3407,
        output_dir=OUTPUT_DIR,
    ),
)

trainer.train()

# ==========================================
# 5. SAVE & INFERENCE TEST
# ==========================================
print("💾 Saving Model...")
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

print("🧪 Running Inference Test...")
FastLanguageModel.for_inference(model)
inputs = tokenizer(
    [
        alpaca_prompt.format(
            "How do I implement a Redis queue in Python?", # Instruction
            "", # Input
            "", # Output - leave this blank for generation!
        )
    ], return_tensors="pt"
).to("cuda")

outputs = model.generate(**inputs, max_new_tokens=128, use_cache=True)
print(tokenizer.batch_decode(outputs))