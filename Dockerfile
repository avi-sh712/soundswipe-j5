FROM public.ecr.aws/lambda/python:3.11

# Install the C++ compilers needed for Machine Learning libraries
RUN yum update -y && yum install -y gcc gcc-c++ make

# Copy requirements and install them
COPY requirements.txt ${LAMBDA_TASK_ROOT}
RUN pip install --no-cache-dir -r requirements.txt

# Copy all your Python code into the Lambda root
COPY . ${LAMBDA_TASK_ROOT}

# Point Lambda to the Mangum handler in main.py
CMD [ "main.handler" ]