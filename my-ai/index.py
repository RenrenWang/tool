# # 环境准备（终端执行）
# # pip install torch transformers datasets scikit-learn

import torch
from torch import nn
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from datasets import load_dataset

# # ========== 第1步：准备数据 ==========
# # 使用GLUE的SST-2情感分析数据集
# dataset = load_dataset("glue", "sst2")
# tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")

# def preprocess(examples):
#     return tokenizer(
#         examples["sentence"], 
#         padding="max_length",
#         truncation=True,
#         max_length=128
#     )

# dataset = dataset.map(preprocess, batched=True)
# dataset.set_format(type="torch", columns=["input_ids", "attention_mask", "label"])

# # ========== 第2步：加载师生模型 ==========
# class StudentModel(nn.Module):
#     """自定义学生模型（比BERT-base小）"""
#     def __init__(self):
#         super().__init__()
#         self.bert = AutoModelForSequenceClassification.from_pretrained(
#             "bert-base-uncased",
#             num_labels=2,
#             hidden_size=384,  # 原BERT为768
#             num_hidden_layers=4,  # 原BERT为12层
#             ignore_mismatched_sizes=True
#         )
    
#     def forward(self, input_ids, attention_mask):
#         return self.bert(input_ids, attention_mask=attention_mask)

# teacher = AutoModelForSequenceClassification.from_pretrained("textattack/bert-base-uncased-SST-2")
# student = StudentModel()

# # ========== 第3步：定义蒸馏损失 ==========
# class DistillLoss(nn.Module):
#     def __init__(self, temperature=5, alpha=0.7):
#         super().__init__()
#         self.temperature = temperature
#         self.alpha = alpha
#         self.kl_loss = nn.KLDivLoss(reduction="batchmean")
#         self.ce_loss = nn.CrossEntropyLoss()
    
#     def forward(self, student_logits, teacher_logits, labels):
#         # 软化教师输出
#         soft_teacher = nn.functional.softmax(teacher_logits / self.temperature, dim=-1)
#         soft_student = nn.functional.log_softmax(student_logits / self.temperature, dim=-1)
        
#         # 计算KL散度损失
#         loss_kl = self.kl_loss(soft_student, soft_teacher) * (self.temperature ** 2)
        
#         # 计算交叉熵损失
#         loss_ce = self.ce_loss(student_logits, labels)
        
#         # 组合损失
#         return self.alpha * loss_kl + (1 - self.alpha) * loss_ce

# # ========== 第4步：训练配置 ==========
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# teacher.to(device).eval()  # 固定教师模型
# student.to(device)
# optimizer = torch.optim.AdamW(student.parameters(), lr=5e-5)
# loss_fn = DistillLoss(temperature=3, alpha=0.7)

# # ========== 第5步：训练循环 ==========
# from torch.utils.data import DataLoader

# train_loader = DataLoader(dataset["train"], batch_size=16, shuffle=True)
# val_loader = DataLoader(dataset["validation"], batch_size=16)
# print("------------start------------")

# for epoch in range(1):  # 完整训练可设为10-20轮
#     # 训练阶段
#     student.train()
#     total_loss = 0
#     for batch in train_loader:
#         inputs = {
#             "input_ids": batch["input_ids"].to(device),
#             "attention_mask": batch["attention_mask"].to(device)
#         }
#         labels = batch["label"].to(device)
        
#         # 教师生成软标签
#         with torch.no_grad():
#             teacher_outputs = teacher(**inputs)
        
#         # 学生推理
#         student_outputs = student(**inputs)
        
#         # 计算损失
#         loss = loss_fn(
#             student_outputs.logits,
#             teacher_outputs.logits,
#             labels
#         )
        
#         # 反向传播
#         optimizer.zero_grad()
#         loss.backward()
#         optimizer.step()
        
#         total_loss += loss.item()
    
#     # 验证阶段
#     student.eval()
#     correct = 0
#     with torch.no_grad():
#         for batch in val_loader:
#             inputs = {
#                 "input_ids": batch["input_ids"].to(device),
#                 "attention_mask": batch["attention_mask"].to(device)
#             }
#             labels = batch["label"].to(device)
            
#             outputs = student(**inputs)
#             preds = torch.argmax(outputs.logits, dim=-1)
#             correct += (preds == labels).sum().item()
    
#     # 打印统计信息
#     print(f"Epoch {epoch+1}")
#     print(f"Train Loss: {total_loss/len(train_loader):.4f}")
#     print(f"Val Acc: {correct/len(dataset['validation'])*100:.2f}%")
#     print("------------------------")

# # ========== 第6步：保存和使用模型 ==========
# # 保存学生模型
# torch.save(student.state_dict(), "distilled_student.pt")

# 使用示例
test_text = "This movie is absolutely wonderful!"
inputs = tokenizer(test_text, return_tensors="pt").to(device)
student.eval()
with torch.no_grad():
    outputs = student(**inputs)
pred = torch.argmax(outputs.logits).item()
print("Prediction:", "Positive" if pred == 1 else "Negative") 